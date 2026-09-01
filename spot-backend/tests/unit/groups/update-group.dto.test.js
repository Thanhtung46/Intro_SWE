import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseUpdateGroupDto } from '../../../src/domains/groups/dto/update-group.dto.js';

describe('parseUpdateGroupDto', () => {
  it('accepts partial title update', () => {
    const dto = parseUpdateGroupDto({ title: 'New tagline' });
    assert.equal(dto.title, 'New tagline');
  });

  it('rejects empty body', () => {
    assert.throws(() => parseUpdateGroupDto({}), /At least one field is required/);
  });

  it('requires courts when recurringSlots are sent', () => {
    assert.throws(
      () =>
        parseUpdateGroupDto({
          recurringSlots: [
            {
              dayOfWeek: 1,
              startsAt: '18:00',
              durationMinutes: 60,
              courtName: 'A',
            },
          ],
        }),
      /courts is required when updating recurringSlots/,
    );
  });
});
