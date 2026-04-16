// ─── CONFIGURATION ──────────────────────────────────────────
const APPOINTMENT_URL = 'http://localhost:5003/api/appointments';
const PAYMENT_URL     = 'http://localhost:5004/api/payments';

// Mock auth headers for testing
const AUTH_HEADERS = {
  'x-user-id': '',
  'x-user-role': 'PATIENT',
  'Content-Type': 'application/json'
};

// ─── NAVIGATION ─────────────────────────────────────────────
function showSection(sectionId, btn) {
  document.querySelectorAll('main > section').forEach(s => {
    s.classList.add('hidden');
    s.classList.remove('active');
  });

  const target = document.getElementById(sectionId);
  if (target) {
    target.classList.remove('hidden');
    target.classList.add('active');
  }

  if (btn) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
}

// ─── SHOW MESSAGE ───────────────────────────────────────────
function showMessage(elementId, text, type = 'info') {
  const el = document.getElementById(elementId);
  el.className = `message-box ${type}`;
  el.textContent = text;
  // Auto-fade after 8s
  setTimeout(() => { el.className = 'message-box'; el.textContent = ''; }, 8000);
}

// ─── BOOKING FORM ───────────────────────────────────────────
document.getElementById('booking-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const doctorSelect = document.getElementById('doctorId');
  const selectedOption = doctorSelect.options[doctorSelect.selectedIndex];

  const payload = {
    patientId: document.getElementById('patientId').value.trim(),
    doctorId: doctorSelect.value,
    doctorName: selectedOption.dataset.name,
    specialty: selectedOption.dataset.specialty || '',
    appointmentDate: document.getElementById('appointmentDate').value,
    startTime: document.getElementById('startTime').value,
    reason: document.getElementById('reason').value.trim(),
    consultationFee: parseFloat(selectedOption.dataset.fee) || 2000
  };

  AUTH_HEADERS['x-user-id'] = payload.patientId;

  try {
    const res = await fetch(APPOINTMENT_URL, {
      method: 'POST',
      headers: AUTH_HEADERS,
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.success) {
      showMessage('booking-message', '✅ Appointment booked! Redirecting to payment...', 'success');

      // Auto navigate to payment section
      setTimeout(() => {
        showPayment(data.data, payload.patientId, parseFloat(selectedOption.dataset.fee) || 2000);
      }, 1200);
    } else {
      showMessage('booking-message', `❌ ${data.message || 'Booking failed'}`, 'error');
    }
  } catch (err) {
    showMessage('booking-message', `❌ Could not connect to Appointment Service (is it running on :5003?)`, 'error');
  }
});

// ─── SHOW PAYMENT SECTION ───────────────────────────────────
function showPayment(appointment, patientId, fee) {
  showSection('payment');

  document.getElementById('payment-details').innerHTML = `
    <p><strong>Appt ID:</strong> ${appointment._id}</p>
    <p><strong>Doctor:</strong> ${appointment.doctorName} (${appointment.specialty || 'N/A'})</p>
    <p><strong>Date:</strong> ${appointment.appointmentDate} at ${appointment.startTime}</p>
    <p><strong>Queue #:</strong> ${appointment.queueNumber}</p>
    <p><strong>Amount:</strong> LKR ${fee.toLocaleString()}</p>
  `;

  const payBtn = document.getElementById('pay-btn');
  payBtn.onclick = () => processPaymentFlow(appointment._id, patientId, appointment.doctorId, fee);
}

// ─── PAYMENT FLOW: Initiate → Confirm ──────────────────────
async function processPaymentFlow(appointmentId, patientId, doctorId, amount) {
  const payBtn = document.getElementById('pay-btn');
  payBtn.disabled = true;
  payBtn.textContent = '⏳ Processing...';

  AUTH_HEADERS['x-user-id'] = patientId;

  try {
    // Step 1: Initiate
    const initRes = await fetch(`${PAYMENT_URL}/initiate`, {
      method: 'POST',
      headers: AUTH_HEADERS,
      body: JSON.stringify({ appointmentId, patientId, doctorId, amount, method: 'CREDIT_CARD' })
    });
    const initData = await initRes.json();

    if (!initData.success) {
      showMessage('payment-message', `❌ ${initData.message || 'Initiation failed'}`, 'error');
      payBtn.disabled = false;
      payBtn.textContent = '💰 Pay Now';
      return;
    }

    const orderId = initData.data.orderId;
    showMessage('payment-message', `📦 Order ${orderId} created. Confirming payment...`, 'info');

    // Step 2: Confirm (after small delay to simulate gateway)
    await new Promise(r => setTimeout(r, 1500));

    const confirmRes = await fetch(`${PAYMENT_URL}/confirm`, {
      method: 'POST',
      headers: AUTH_HEADERS,
      body: JSON.stringify({ orderId })
    });
    const confirmData = await confirmRes.json();

    if (confirmData.success) {
      showMessage('payment-message',
        `🎉 Payment successful! Transaction: ${confirmData.data.transactionId}. Appointment CONFIRMED.`, 'success'
      );
      payBtn.textContent = '✅ Paid';
    } else {
      showMessage('payment-message', `❌ ${confirmData.message || 'Payment failed'}`, 'error');
      payBtn.disabled = false;
      payBtn.textContent = '💰 Retry Payment';
    }
  } catch (err) {
    showMessage('payment-message', `❌ Could not connect to Payment Service (is it running on :5004?)`, 'error');
    payBtn.disabled = false;
    payBtn.textContent = '💰 Pay Now';
  }
}

// ─── FETCH APPOINTMENTS ─────────────────────────────────────
async function fetchAppointments() {
  const pid = document.getElementById('search-patient-id').value.trim();
  if (!pid) { alert('Please enter your Patient ID'); return; }

  AUTH_HEADERS['x-user-id'] = pid;

  try {
    const res = await fetch(`${APPOINTMENT_URL}?patientId=${pid}`, {
      headers: AUTH_HEADERS
    });
    const data = await res.json();

    const tbody = document.querySelector('#appointments-table tbody');
    const emptyEl = document.getElementById('empty-appointments');
    tbody.innerHTML = '';

    const appointments = data.data?.appointments || data.data || [];

    if (appointments.length === 0) {
      emptyEl.classList.remove('hidden');
      return;
    }

    emptyEl.classList.add('hidden');

    appointments.forEach(a => {
      const statusClass = `badge-${a.status.toLowerCase()}`;
      const payClass = `badge-${a.paymentStatus.toLowerCase()}`;

      let actions = '';

      // Cancel button (only if PENDING or CONFIRMED)
      if (['PENDING', 'CONFIRMED'].includes(a.status)) {
        actions += `<button class="btn-cancel" onclick="cancelAppointment('${a._id}', '${pid}')">Cancel</button>`;
      }

      // Pay button (only if UNPAID and not CANCELLED)
      if (a.paymentStatus === 'UNPAID' && a.status !== 'CANCELLED') {
        actions += `<button onclick="showPayment({_id:'${a._id}', doctorName:'${a.doctorName}', specialty:'${a.specialty||''}', appointmentDate:'${a.appointmentDate}', startTime:'${a.startTime}', queueNumber:${a.queueNumber}, doctorId:'${a.doctorId}'}, '${pid}', ${a.consultationFee || 2000})">Pay</button>`;
      }

      // Queue button (only if PENDING or CONFIRMED)
      if (['PENDING', 'CONFIRMED'].includes(a.status)) {
        actions += `<button onclick="checkQueue('${a._id}', '${pid}')">Queue</button>`;
      }

      tbody.innerHTML += `
        <tr>
          <td>${a.appointmentDate} ${a.startTime}</td>
          <td>${a.doctorName}</td>
          <td><span class="badge ${statusClass}">${a.status}</span></td>
          <td><span class="badge ${payClass}">${a.paymentStatus}</span></td>
          <td>#${a.queueNumber}</td>
          <td>${actions || '—'}</td>
        </tr>
      `;
    });
  } catch (err) {
    alert('Error fetching appointments. Ensure the service is running.');
  }
}

// ─── CANCEL APPOINTMENT ─────────────────────────────────────
async function cancelAppointment(apptId, pid) {
  if (!confirm('Are you sure you want to cancel this appointment?')) return;

  AUTH_HEADERS['x-user-id'] = pid;

  try {
    const res = await fetch(`${APPOINTMENT_URL}/${apptId}/cancel`, {
      method: 'PATCH',
      headers: AUTH_HEADERS
    });
    const data = await res.json();

    if (data.success) {
      alert('✅ Appointment cancelled.');
      fetchAppointments();
    } else {
      alert(`❌ ${data.message}`);
    }
  } catch (err) {
    alert('Error cancelling appointment.');
  }
}

// ─── CHECK QUEUE ────────────────────────────────────────────
async function checkQueue(apptId, pid) {
  AUTH_HEADERS['x-user-id'] = pid;

  try {
    const res = await fetch(`${APPOINTMENT_URL}/${apptId}/queue`, {
      headers: AUTH_HEADERS
    });
    const data = await res.json();

    if (data.success) {
      const q = data.data;
      alert(`🔢 Queue #${q.myQueueNumber}\n👥 People ahead: ${q.peopleAheadOfMe}\n⏱ Estimated wait: ~${q.estimatedWaitMinutes} min`);
    } else {
      alert(`❌ ${data.message}`);
    }
  } catch (err) {
    alert('Error checking queue.');
  }
}

// ─── FETCH PAYMENT HISTORY ──────────────────────────────────
async function fetchPaymentHistory() {
  const pid = document.getElementById('search-history-patient-id').value.trim();
  if (!pid) { alert('Please enter your Patient ID'); return; }

  AUTH_HEADERS['x-user-id'] = pid;

  try {
    const res = await fetch(`${PAYMENT_URL}?patientId=${pid}`, {
      headers: AUTH_HEADERS
    });
    const data = await res.json();

    const tbody = document.querySelector('#payment-history-table tbody');
    const emptyEl = document.getElementById('empty-payments');
    tbody.innerHTML = '';

    const payments = data.data || [];

    if (payments.length === 0) {
      emptyEl.classList.remove('hidden');
      return;
    }

    emptyEl.classList.add('hidden');

    payments.forEach(p => {
      const statusClass = `badge-${p.status.toLowerCase()}`;
      const invoiceBtn = p.status === 'SUCCESS'
        ? `<button class="btn-invoice" onclick="window.open('${PAYMENT_URL}/${p._id}/invoice', '_blank')">📄 Download</button>`
        : '—';

      tbody.innerHTML += `
        <tr>
          <td>${p.orderId || '—'}</td>
          <td>${new Date(p.createdAt).toLocaleDateString()}</td>
          <td>LKR ${(p.amount || 0).toLocaleString()}</td>
          <td>${p.method || '—'}</td>
          <td><span class="badge ${statusClass}">${p.status}</span></td>
          <td>${invoiceBtn}</td>
        </tr>
      `;
    });
  } catch (err) {
    alert('Error fetching payment history.');
  }
}

// ─── DATE DEFAULTS ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const dateInput = document.getElementById('appointmentDate');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  dateInput.min = tomorrow.toISOString().split('T')[0];
  dateInput.value = tomorrow.toISOString().split('T')[0];

  const timeInput = document.getElementById('startTime');
  timeInput.value = '09:00';
});
