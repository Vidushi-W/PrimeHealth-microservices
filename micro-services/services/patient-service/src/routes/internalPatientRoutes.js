const express = require("express");
const { getDoctorPatientSummary } = require("../controllers/patientProfileController");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const PatientAppointment = require("../models/PatientAppointment");

const router = express.Router();

const ALLOWED_SYNC_ROLES = new Set(["patient", "doctor", "admin"]);

function normalizeSyncStatus(status) {
	return String(status || "").trim().toLowerCase();
}

function validateInternalToken(req, res, next) {
	const expected = process.env.INTERNAL_SERVICE_TOKEN;

	if (!expected) {
		return next();
	}

	const provided = req.headers["x-internal-service-token"];

	if (provided !== expected) {
		return res.status(403).json({
			success: false,
			message: "Forbidden: invalid internal service token",
		});
	}

	return next();
}

router.get("/patients/:patientId/summary", getDoctorPatientSummary);

router.post("/users/sync", validateInternalToken, async (req, res) => {
	try {
		const role = String(req.body?.role || "").trim().toLowerCase();
		const email = String(req.body?.email || "").trim().toLowerCase();
		const externalRef = String(req.body?.externalRef || req.body?.adminId || req.body?.id || "").trim();
		const uniqueId = String(req.body?.uniqueId || "").trim();

		if (!ALLOWED_SYNC_ROLES.has(role)) {
			return res.status(400).json({ success: false, message: "role must be patient, doctor, or admin" });
		}

		if (!email) {
			return res.status(400).json({ success: false, message: "email is required" });
		}

		const existingUser = await User.findOne({
			$or: [
				...(externalRef ? [{ externalRef }] : []),
				...(uniqueId ? [{ uniqueId }] : []),
				{ email },
			],
		}).select("+passwordHash");

		const status = normalizeSyncStatus(req.body?.status);
		const statusDrivenIsActive = !["deactivated", "inactive", "suspended"].includes(status);
		const statusDrivenIsVerified = status === "verified";

		const updates = {
			fullName: String(req.body?.fullName || req.body?.name || existingUser?.fullName || email).trim(),
			email,
			role,
			...(externalRef ? { externalRef } : {}),
			...(uniqueId ? { uniqueId } : {}),
			phone: String(req.body?.phone || existingUser?.phone || "").trim(),
			isActive: req.body?.isActive !== undefined ? Boolean(req.body.isActive) : statusDrivenIsActive,
			isVerified: req.body?.isVerified !== undefined ? Boolean(req.body.isVerified) : statusDrivenIsVerified,
		};

		if (req.body?.passwordHash) {
			updates.passwordHash = String(req.body.passwordHash);
		} else if (!existingUser?.passwordHash) {
			updates.passwordHash = await bcrypt.hash(`sync-user-${Date.now()}`, 10);
		}

		const syncQuery = existingUser?._id ? { _id: existingUser._id } : { email };

		const syncedUser = await User.findOneAndUpdate(syncQuery, updates, {
			new: true,
			upsert: !existingUser,
			setDefaultsOnInsert: true,
			runValidators: true,
		});

		return res.json({
			success: true,
			user: {
				id: syncedUser._id,
				fullName: syncedUser.fullName,
				email: syncedUser.email,
				role: syncedUser.role,
				isActive: syncedUser.isActive,
				isVerified: syncedUser.isVerified,
				externalRef: syncedUser.externalRef || "",
				uniqueId: syncedUser.uniqueId || "",
			},
		});
	} catch (error) {
		return res.status(500).json({ success: false, message: "Failed to sync user", error: error.message });
	}
});

router.patch("/appointments/:externalAppointmentId/sync-status", validateInternalToken, async (req, res) => {
  try {
    const externalAppointmentId = String(req.params.externalAppointmentId || "").trim();
    if (!externalAppointmentId) {
      return res.status(400).json({ success: false, message: "externalAppointmentId is required" });
    }

    const updates = {};
    if (req.body?.status) {
      const status = String(req.body.status || "").trim().toLowerCase();
      const statusMap = {
        pending: "pending_payment",
        confirmed: "confirmed",
        completed: "completed",
        cancelled: "cancelled"
      };
      updates.status = statusMap[status] || status;
    }

    if (req.body?.paymentStatus) {
      const paymentStatus = String(req.body.paymentStatus || "").trim().toLowerCase();
      const paymentMap = {
        unpaid: "pending",
        pending: "pending",
        paid: "paid",
        failed: "failed",
        refunded: "refunded"
      };
      updates.paymentStatus = paymentMap[paymentStatus] || paymentStatus;
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ success: false, message: "No sync fields provided" });
    }

    const appointment = await PatientAppointment.findOneAndUpdate(
      { externalAppointmentId },
      updates,
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({ success: false, message: "Patient appointment not found for external appointment id" });
    }

    return res.json({
      success: true,
      data: {
        id: appointment._id,
        externalAppointmentId: appointment.externalAppointmentId,
        status: appointment.status,
        paymentStatus: appointment.paymentStatus
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to sync appointment status", error: error.message });
  }
});

module.exports = router;
