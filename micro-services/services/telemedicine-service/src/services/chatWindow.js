const isChatWindowOpen = (session, now, preMinutes, postMinutes) => {
    const nowMs = now.getTime();
    const scheduledStartMs = new Date(session.scheduledStartAt).getTime();

    const preWindowStart = scheduledStartMs - preMinutes * 60 * 1000;
    const afterAnchor = session.endedAt
        ? new Date(session.endedAt).getTime()
        : new Date(session.scheduledEndAt).getTime();
    const postWindowEnd = afterAnchor + postMinutes * 60 * 1000;

    return nowMs >= preWindowStart && nowMs <= postWindowEnd;
};

module.exports = {
    isChatWindowOpen
};
