import { Container } from 'typedi';

import { Db } from '../../db/db.class';
import { RoleRepository } from './role.repository';

describe('RoleRepository', () => {
  let db;
  let service: RoleRepository;

  beforeEach(() => {
    db = {
      role: {
        insert: jest.fn(),
      },
    };
    Container.reset();
    Container.set(Db, db);
    service = Container.get(RoleRepository);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });
});
