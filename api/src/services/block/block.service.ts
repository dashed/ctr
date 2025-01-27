import { Service } from 'typedi';

import {
  BlockRepository,
  MapLocationRepository,
  HoodRepository,
  RoleAssignmentRepository,
  RoleRepository,
  MemberRepository,
} from '../../repositories';
import {Member, Place} from '../../types/models';
import {request} from 'express';

/** Service for dealing with blocks */
@Service()
export class BlockService {
  constructor(
    private blockRepository: BlockRepository,
    private mapLocationRepository: MapLocationRepository,
    private hoodRepository: HoodRepository,
    private roleAssignmentRepository: RoleAssignmentRepository,
    private roleRepository: RoleRepository,
    private memberRepository: MemberRepository,
  ) {}

  public async find(blockId: number): Promise<Place> {
    return await this.blockRepository.find(blockId);
  }

  public async getHood(blockId: number): Promise<Place> {
    const blockMapLocation = await this.mapLocationRepository.findPlaceIdMapLocation(blockId);
    return await this.hoodRepository.find(blockMapLocation.parent_place_id);
  }
  
  public async getAccessInfoByUsername(blockId: number): Promise<object> {
    const deputyCode = await this.roleRepository.roleMap.BlockDeputy;
    const ownerCode = await this.roleRepository.roleMap.BlockLeader;
    return await this.blockRepository.getAccessInfoByUsername(blockId, ownerCode, deputyCode);
  }
  
  public async postAccessInfo(
    blockId: number,
    givenDeputies: any,
    givenOwner: string): Promise<void> {
    /**
     * old is coming from database
     * new is coming from access rights page
     */
    const deputyCode = await this.roleRepository.roleMap.BlockDeputy;
    const ownerCode = await this.roleRepository.roleMap.BlockLeader;
    let oldOwner = null;
    let newOwner = null;
    const oldDeputies = [0,0,0,0,0,0,0,0];
    const newDeputies = [0,0,0,0,0,0,0,0];
    const data = await this.blockRepository.getAccessInfoByID(blockId, ownerCode, deputyCode);
    if (data.owner.length > 0) {
      oldOwner = data.owner[0].member_id;
    } else {
      oldOwner = 0;
    }
    try {
      newOwner = await this.memberRepository.findIdByUsername(givenOwner);
      newOwner = newOwner[0].id;
    } catch (error) {
      newOwner = 0;
    }
    if (newOwner !== 0) {
      if (oldOwner !== 0){
        await this.blockRepository.removeIdFromAssignment(blockId, oldOwner, ownerCode);
      }
      await this.blockRepository.addIdToAssignment(blockId, newOwner, ownerCode);
    }
    data.deputies.forEach((deputies, index) => {
      oldDeputies[index] = deputies.member_id;
    });
    for (const [index, deputy] of givenDeputies.entries()) try {
      const result: any = await this.memberRepository.findIdByUsername(deputy.username);
      newDeputies[index] = result[0].id;
    } catch (error) {
      break;
    }
    oldDeputies.forEach((oldDeputies, index) => {
      if (oldDeputies !== newDeputies[index]) {
        if (newDeputies[index] === 0) {
          try {
            this.blockRepository.removeIdFromAssignment(blockId, oldDeputies, deputyCode);
          } catch (e) {
            console.log(e);
          }
        } else {
          try {
            this.blockRepository.removeIdFromAssignment(blockId, oldDeputies, deputyCode);
            this.blockRepository.addIdToAssignment(blockId, newDeputies[index], deputyCode);
          } catch (e) {
            console.log(e);
          }
        }
      }
    });
    return;
  }

  public async getMapLocationAndPlaces(blockId: number): Promise<any> {
    return await this.blockRepository.getMapLocationAndPlacesByBlockId(blockId);
  }

  public async resetMapLocationAvailability(blockId: number): Promise<void> {
    return await this.mapLocationRepository.resetAvailabilityByParentPlaceId(blockId);
  }

  public async setMapLocationAvailable(blockId: number, location: number): Promise<void> {
    return await this.mapLocationRepository.createAvailableLocation(blockId, location);
  }

  public async canAdmin(blockId: number, memberId: number): Promise<boolean> {
    const roleAssignments = await this.roleAssignmentRepository.getByMemberId(memberId);
    const hood = await this.getHood(blockId);
    const hoodMapLocation = await this.mapLocationRepository.findPlaceIdMapLocation(hood.id);
    const colonyId = hoodMapLocation.parent_place_id;

    if (
      roleAssignments.find(assignment => {
        return (
          [
            this.roleRepository.roleMap.Admin,
            this.roleRepository.roleMap.CityMayor,
            this.roleRepository.roleMap.DeputyMayor,
          ].includes(assignment.role_id) ||
          ([
            this.roleRepository.roleMap.ColonyLeader,
            this.roleRepository.roleMap.ColonyDeputy,
          ].includes(assignment.role_id) &&
            assignment.place_id === colonyId) ||
          ([
            this.roleRepository.roleMap.NeighborhoodDeputy,
            this.roleRepository.roleMap.NeighborhoodLeader,
          ].includes(assignment.role_id) &&
            assignment.place_id === hood.id) ||
          ([
            this.roleRepository.roleMap.BlockDeputy,
            this.roleRepository.roleMap.BlockLeader,
          ].includes(assignment.role_id) &&
            assignment.place_id === blockId)
        );
      })
    ) {
      return true;
    }
    return false;
  }

  public async canManageAccess(blockId: number, memberId: number): Promise<boolean> {
    const roleAssignments = await this.roleAssignmentRepository.getByMemberId(memberId);
    const hood = await this.getHood(blockId);
    const hoodMapLocation = await this.mapLocationRepository.findPlaceIdMapLocation(hood.id);
    const colonyId = hoodMapLocation.parent_place_id;

    if (
      roleAssignments.find(assignment => {
        return (
          [
            this.roleRepository.roleMap.Admin,
            this.roleRepository.roleMap.CityMayor,
            this.roleRepository.roleMap.DeputyMayor,
          ].includes(assignment.role_id) ||
          ([
            this.roleRepository.roleMap.ColonyLeader,
            this.roleRepository.roleMap.ColonyDeputy,
          ].includes(assignment.role_id) &&
            assignment.place_id === colonyId) ||
          ([
            this.roleRepository.roleMap.NeighborhoodDeputy,
            this.roleRepository.roleMap.NeighborhoodLeader,
          ].includes(assignment.role_id) &&
            assignment.place_id === hood.id) ||
          ([this.roleRepository.roleMap.BlockLeader].includes(assignment.role_id) &&
            assignment.place_id === blockId)
        );
      })
    ) {
      return true;
    }
    return false;
  }
}
