import {afterEach,describe,expect,it,vi} from 'vitest';
import {encryptConfig,decryptConfig} from './services/credentials';
import {bindGmailStateCookie} from './services/mailbox';
afterEach(()=>vi.unstubAllEnvs());
describe('mailbox credential boundaries',()=>{
  it('encrypts credentials and authenticates exact company/provider scope',()=>{
    vi.stubEnv('MANUS_JWT_SECRET','unit-test-only-stable-master-key');
    const config={password:'unit-test-private-token'};
    const encrypted=encryptConfig(config,1,'imap');
    expect(encrypted).not.toContain(config.password);
    expect(decryptConfig(encrypted,1,'imap')).toEqual(config);
    expect(()=>decryptConfig(encrypted,2,'imap')).toThrow();
    expect(()=>decryptConfig(encrypted,1,'gmail')).toThrow();
    expect(encryptConfig(config,1,'imap')).not.toBe(encrypted);
  });
  it('uses browser-bound secure HTTP-only Gmail state cookie',()=>{
    const cookie=vi.fn();
    bindGmailStateCookie({cookie} as any,'https://accounts.google.com/o/oauth2/v2/auth?state=test-state');
    expect(cookie).toHaveBeenCalledWith('leadloom_gmail_oauth_state','test-state',expect.objectContaining({httpOnly:true,secure:true,sameSite:'none',path:'/api/mailbox/gmail/callback'}));
  });
});
