const SequenceCounter = require('../models/SequenceCounter');

const ROLE_ID_CONFIG = {
    admin: { counterKey: 'admin_unique_id', prefix: 'ADM' },
    doctor: { counterKey: 'doctor_unique_id', prefix: 'DOC' },
    patient: { counterKey: 'patient_unique_id', prefix: 'PAT' }
};

const formatUniqueId = (prefix, number) => `${prefix}${String(number).padStart(3, '0')}`;

const parseUniqueIdNumber = (value, prefix) => {
    if (typeof value !== 'string') {
        return null;
    }

    const regex = new RegExp(`^${prefix}(\\d+)$`);
    const match = value.match(regex);

    if (!match) {
        return null;
    }

    const parsed = Number.parseInt(match[1], 10);
    return Number.isNaN(parsed) ? null : parsed;
};

const getNextUniqueIdForRole = async (roleKey) => {
    const config = ROLE_ID_CONFIG[roleKey];

    if (!config) {
        throw new Error(`Unsupported role key for unique ID generation: ${roleKey}`);
    }

    const counter = await SequenceCounter.findByIdAndUpdate(
        config.counterKey,
        { $inc: { seq: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return formatUniqueId(config.prefix, counter.seq);
};

const syncCounterForRole = async (roleKey, model) => {
    const config = ROLE_ID_CONFIG[roleKey];

    if (!config) {
        throw new Error(`Unsupported role key for counter sync: ${roleKey}`);
    }

    const docs = await model.find({ uniqueId: { $regex: `^${config.prefix}\\d+$` } }).select('uniqueId').lean();

    let maxSequence = 0;

    for (const doc of docs) {
        const parsed = parseUniqueIdNumber(doc.uniqueId, config.prefix);
        if (parsed && parsed > maxSequence) {
            maxSequence = parsed;
        }
    }

    await SequenceCounter.findByIdAndUpdate(
        config.counterKey,
        { $max: { seq: maxSequence } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );
};

module.exports = {
    ROLE_ID_CONFIG,
    formatUniqueId,
    parseUniqueIdNumber,
    getNextUniqueIdForRole,
    syncCounterForRole
};
