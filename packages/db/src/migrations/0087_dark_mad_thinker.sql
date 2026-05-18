ALTER TABLE "projects" ADD COLUMN "github_repository_links" jsonb DEFAULT '[]'::jsonb NOT NULL;
