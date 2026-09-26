import { dayIdFromTemplate, dayTemplateId } from './ActiveSessionController';
import { PLAN_REVISION } from './planToSnapshots';

describe('day template ids', () => {
  it('embeds plan revision', () => {
    expect(dayTemplateId('legs')).toBe(`day-legs@${PLAN_REVISION}`);
  });

  it('parses revisioned and legacy templates', () => {
    expect(dayIdFromTemplate(`day-push@${PLAN_REVISION}`)).toBe('push');
    expect(dayIdFromTemplate('day-push')).toBe('push');
    expect(dayIdFromTemplate('other')).toBeNull();
  });
});
