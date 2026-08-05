"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HorizonEngine = void 0;
class HorizonEngine {
    events = new Map();
    addEvent(event) {
        this.events.set(event.id, event);
        return event;
    }
    attachPredictionOdds(eventId, odds) {
        const event = this.events.get(eventId);
        if (!event)
            return false;
        if (!event.attachedOdds) {
            event.attachedOdds = [];
        }
        event.attachedOdds.push(odds);
        return true;
    }
    getForwardCalendar(daysAhead = 90) {
        const now = new Date().getTime();
        const cutoff = now + daysAhead * 86400000;
        const result = [];
        for (const event of this.events.values()) {
            const eventTime = new Date(event.scheduledAt).getTime();
            if (eventTime >= now && eventTime <= cutoff) {
                const daysUntil = Math.ceil((eventTime - now) / 86400000);
                result.push({
                    ...event,
                    daysUntil
                });
            }
        }
        return result.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    }
}
exports.HorizonEngine = HorizonEngine;
//# sourceMappingURL=index.js.map