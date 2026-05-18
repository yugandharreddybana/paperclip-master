import { Router } from "express";
import { z } from "zod";
import type { Db } from "@paperclipai/db";
import type { DeploymentMode } from "@paperclipai/shared";
import { badRequest } from "../errors.js";
import {
  buildGithubIntegrationStatus,
  fetchGithubUserRepositories,
  resolveGithubAccessToken,
} from "../services/github-integration.js";
import { assertBoard } from "./authz.js";

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(200).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(30),
  q: z.string().max(200).optional(),
});

export function githubRoutes(db: Db, opts: { deploymentMode: DeploymentMode }) {
  const router = Router();

  router.get("/github/status", async (req, res, next) => {
    try {
      assertBoard(req);
      const userId = req.actor.userId;
      if (!userId) {
        throw badRequest("Missing board user");
      }
      const status = await buildGithubIntegrationStatus(db, {
        userId,
        deploymentMode: opts.deploymentMode,
      });
      res.json(status);
    } catch (err) {
      next(err);
    }
  });

  router.get("/github/repositories", async (req, res, next) => {
    try {
      assertBoard(req);
      const userId = req.actor.userId;
      if (!userId) {
        throw badRequest("Missing board user");
      }
      const parsed = listQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw badRequest("Invalid query parameters");
      }
      const { page, pageSize, q } = parsed.data;
      const tokenPack = await resolveGithubAccessToken(db, userId);
      if (!tokenPack) {
        res.status(403).json({
          error:
            "GitHub token unavailable. In authenticated mode, link GitHub under your account. " +
            "In local-trusted dev, set PAPERCLIP_GITHUB_PAT for the implicit local board user.",
        });
        return;
      }
      const { items } = await fetchGithubUserRepositories({
        token: tokenPack.token,
        page,
        pageSize,
        search: q,
      });
      res.json({ page, pageSize, items });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
