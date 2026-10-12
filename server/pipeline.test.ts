import {describe,it,expect} from 'vitest';
import {pipelineConfigSchema,pacingWindow,nextDiscoveryAt,discoveryResultSchema} from '../shared/pipeline';
const config=pipelineConfigSchema.parse({icpId:1});
describe('TailorPitch paced discovery configuration',()=>{
 it('starts conservatively with bounded daily volume and no automatic outreach',()=>{
  expect(config.dailyLimit).toBe(3);expect(config.intervalMinutes).toBe(240);expect(config.outreach).toBe(false);expect(config.weekdaysOnly).toBe(true);expect(config.startHour).toBe(9);expect(config.endHour).toBe(17);
 });
 it('rejects bulk throughput and inverted work windows',()=>{
  expect(pipelineConfigSchema.safeParse({...config,dailyLimit:10000}).success).toBe(false);
  expect(pipelineConfigSchema.safeParse({...config,intervalMinutes:1}).success).toBe(false);
  expect(pipelineConfigSchema.safeParse({...config,startHour:17,endHour:9}).success).toBe(false);
 });
 it('uses the configured timezone and local calendar day',()=>{
  const ny={...config,timezone:'America/New_York'};
  expect(pacingWindow(ny,new Date('2026-10-12T13:30:00Z'))).toEqual({day:'2026-10-12',allowed:true});
  expect(pacingWindow(ny,new Date('2026-10-12T00:30:00Z'))).toEqual({day:'2026-10-11',allowed:false});
 });
 it('blocks weekend and after-hours new discoveries',()=>{
  expect(pacingWindow(config,new Date('2026-10-11T10:00:00Z')).allowed).toBe(false);
  expect(pacingWindow(config,new Date('2026-10-12T17:00:00Z')).allowed).toBe(false);
 });
 it('reserves the next bounded discovery cadence',()=>{
  expect(nextDiscoveryAt(config,new Date('2026-10-12T09:00:00Z')).toISOString()).toBe('2026-10-12T13:00:00.000Z');
 });
 it('rejects unbounded provider candidates and invented malformed contact addresses',()=>{
  const candidate={companyName:'Example',website:'https://example.com',sourceUrl:'https://example.com/news',contactName:'',email:'',title:'',linkedinUrl:'',xUrl:'',signal:'Public source'};
  expect(discoveryResultSchema.safeParse({candidates:[candidate],summary:'One candidate'}).success).toBe(true);
  expect(discoveryResultSchema.safeParse({candidates:[candidate,candidate],summary:'Too many'}).success).toBe(false);
  expect(discoveryResultSchema.safeParse({candidates:[{...candidate,email:'invented'}],summary:'Invalid'}).success).toBe(false);
 });
});
