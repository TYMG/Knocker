import { describe, expect, it } from 'vitest';
import { nameProblem } from '../../shared/moderation.js';

describe('the name filter', () => {
  it('refuses swearing and slurs in team names, however they are spelled', () => {
    for (const bad of ['Shit Flippers', 'sh1t show', 'F.U.C.K', 'f u c k ups', 'Shiiit', 'Tilt Bitches', 'xxNiggaxx']) expect(nameProblem(bad)).not.toBe('');
  });
  it('lets ordinary names through', () => {
    for (const ok of ['Left & Right', 'Scunthorpe Flippers', 'Dickens and Twist', 'Assassins', 'Flame Retardant', 'Raccoon Rally', 'Niger Delta', 'Cocktail Hour', 'Grasshoppers', 'Tilt Me Tender']) expect(nameProblem(ok)).toBe('');
  });
  it("only refuses slurs in people's names", () => {
    expect(nameProblem('Dick', 'person')).toBe('');
    expect(nameProblem('Dick', 'team')).not.toBe('');
    expect(nameProblem('faggot', 'person')).not.toBe('');
  });
});
