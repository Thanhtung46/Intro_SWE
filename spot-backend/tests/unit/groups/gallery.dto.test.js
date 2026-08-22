import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCreateGalleryImageDto,
  parseListGalleryQuery,
} from '../../../src/domains/groups/dto/gallery.dto.js';

describe('gallery dto', () => {
  it('parses create gallery image', () => {
    const dto = parseCreateGalleryImageDto({
      imageUrl: 'https://cdn.example.com/a.webp',
    });
    assert.equal(dto.imageUrl, 'https://cdn.example.com/a.webp');
  });

  it('defaults list gallery pagination', () => {
    const query = parseListGalleryQuery({});
    assert.equal(query.limit, 20);
    assert.equal(query.offset, 0);
  });
});
