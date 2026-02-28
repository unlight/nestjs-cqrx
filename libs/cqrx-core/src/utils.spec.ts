import { describe, it, expect } from 'vitest';
import { streamToAggregate } from './utils.ts';

describe('streamToAggregate', () => {
  it('should correctly parse a stream with an underscore', () => {
    const result = streamToAggregate('user_123');
    expect(result.aggregateId).toBe('123');
    expect(result.aggregateType).toBe('user');
  });

  it.skip('should return the entire stream as aggregateId if no underscore is present', () => {
    const result = streamToAggregate('user123');
    expect(result.aggregateId).toBe('user123');
    expect(result.aggregateType).toBe('');
  });

  it('should handle streams with multiple underscores', () => {
    const result = streamToAggregate('user_profile_123');
    expect(result.aggregateId).toBe('123');
    expect(result.aggregateType).toBe('user_profile');
  });

  it('should handle empty streams', () => {
    const result = streamToAggregate('');
    expect(result.aggregateId).toBe('');
    expect(result.aggregateType).toBe('');
  });

  it.skip('should handle streams that start with an underscore', () => {
    const result = streamToAggregate('_123');
    expect(result.aggregateId).toBe('_123');
    expect(result.aggregateType).toBe('');
  });
});
