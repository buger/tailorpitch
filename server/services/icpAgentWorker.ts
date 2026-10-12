import type { Express } from "express";
import { eq, and, sql } from "drizzle-orm";
import { jwtVerify } from "jose";
import { parse } from "cookie";
import { db } from "./tenant";
import { icpAgents } from "../../drizzle/schema";
import { tickIcpAgent } from "./icpAgents";
let localRunning = false;
export function startIcpAgentWorker() {
  if (
    process.env.TAILORPITCH_AGENT_WORKER !== "local" ||
    !["127.0.0.1", "localhost", "::1"].includes(process.env.HOST ?? "")
  )
    return () => {};
  const advance = async () => {
    if (localRunning) return;
    localRunning = true;
    try {
      const agents = await (
        await db()
      )
        .select()
        .from(icpAgents)
        .where(eq(icpAgents.enabled, 1))
        .orderBy(sql`COALESCE(${icpAgents.lastTickAt}, '1970-01-01')`)
        .limit(100);
      for (const agent of agents
        .filter(a => a.config.execution === "local")
        .slice(0, 10))
        await tickIcpAgent(agent.companyId, agent.id, "local");
    } catch {
      console.warn(
        "[ICP agents] Dispatch could not finish; durable state is retained."
      );
    } finally {
      localRunning = false;
    }
  };
  const timer = setInterval(() => void advance(), 60000);
  timer.unref();
  return () => clearInterval(timer);
}
export function registerIcpAgentRoutes(app: Express) {
  app.post("/api/scheduled/icp-agent", async (req, res) => {
    let agent;
    try {
      const token = parse(req.headers.cookie ?? "").app_session_id;
      if (!token) throw Error("Missing schedule identity");
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(process.env.MANUS_JWT_SECRET),
        { algorithms: ["HS256"] }
      );
      if (
        payload.appId !== process.env.MANUS_PROJECT_ID ||
        typeof payload.openId !== "string" ||
        !payload.openId.startsWith("cron_")
      )
        throw Error("Invalid identity");
      const response = await fetch(
        `${process.env.MANUS_OAUTH_API_URL}/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jwt_token: token,
            project_id: process.env.MANUS_PROJECT_ID,
          }),
          signal: AbortSignal.timeout(15000),
        }
      );
      if (!response.ok) throw Error("Invalid schedule");
      const identity = await response.json();
      if (
        !identity.taskUid ||
        identity.projectId !== process.env.MANUS_PROJECT_ID
      )
        throw Error("Invalid attribution");
      [agent] = await (await db())
        .select()
        .from(icpAgents)
        .where(eq(icpAgents.scheduleTaskUid, identity.taskUid))
        .limit(1);
      if (!agent || agent.config.execution !== "hosted")
        throw Error("Schedule not mapped");
    } catch {
      res
        .status(401)
        .json({ error: "ICP agent schedule could not be authenticated." });
      return;
    }
    try {
      res.json(await tickIcpAgent(agent.companyId, agent.id, "hosted"));
    } catch {
      res
        .status(500)
        .json({
          error: "ICP agent could not advance; inspect its saved activity.",
        });
    }
  });
}
