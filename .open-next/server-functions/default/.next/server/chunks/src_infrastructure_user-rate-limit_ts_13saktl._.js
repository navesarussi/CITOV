module.exports=[48689,e=>e.a(async(t,r)=>{try{var n=e.i(85395),i=e.i(77773),a=e.i(19117),s=t([n,i]);[n,i]=s.then?(await s)():s;let c=new Map;function o(e){let t=e?.limit??Number(process.env.AI_RATE_LIMIT_PER_USER??40),r=e?.windowMs??Number(process.env.AI_RATE_LIMIT_WINDOW_MS??6e4);return{limit:Number.isFinite(t)&&t>0?t:40,windowMs:Number.isFinite(r)&&r>0?r:6e4}}function u(e,t){let{limit:r,windowMs:n}=o(t);if(r<=0)return{allowed:!0};let i=Date.now(),a=`ai::${e}`,s=c.get(a);return((!s||i>=s.resetAt)&&(s={count:0,resetAt:i+n},c.set(a,s)),s.count>=r)?{allowed:!1,retryAfterSec:Math.ceil((s.resetAt-i)/1e3)}:(s.count+=1,{allowed:!0})}async function w(e,t,r,a){await (0,n.ensureSchema)();let s=await (0,i.getPool)(),o=Date.now(),u=Math.floor(o/a)*a,w=new Date(u),l=await s.query(`
    insert into user_rate_limit_windows (user_id, bucket, window_start, request_count)
    values ($1, $2, $3, 1)
    on conflict (user_id, bucket) do update set
      request_count = case
        when user_rate_limit_windows.window_start < $3 then 1
        else user_rate_limit_windows.request_count + 1
      end,
      window_start = case
        when user_rate_limit_windows.window_start < $3 then $3
        else user_rate_limit_windows.window_start
      end
    returning request_count
    `,[e,t,w]);return(l.rows[0]?.request_count??1)>r?{allowed:!1,retryAfterSec:Math.max(1,Math.ceil((u+a-o)/1e3))}:{allowed:!0}}async function l(e,t){let{limit:r,windowMs:n}=o(t);if(r<=0)return{allowed:!0};if((0,a.shouldUseMemoryStore)())return u(e,t);let i=t?.bucket??"ai";try{return await w(e,i,r,n)}catch(r){return console.warn("[rate-limit] db check failed, falling back to memory",r),u(e,t)}}e.s(["checkUserRateLimitAsync",0,l]),r()}catch(e){r(e)}},!1)];

//# sourceMappingURL=src_infrastructure_user-rate-limit_ts_13saktl._.js.map