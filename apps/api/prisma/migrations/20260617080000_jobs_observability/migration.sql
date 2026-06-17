-- AlterTable
ALTER TABLE "jobs" DROP COLUMN "data",
DROP COLUMN "last_error",
DROP COLUMN "name",
ADD COLUMN     "duration_ms" INTEGER,
ADD COLUMN     "error" TEXT,
ADD COLUMN     "finished_at" TIMESTAMPTZ(6),
ADD COLUMN     "job_id" TEXT,
ADD COLUMN     "job_name" TEXT NOT NULL,
ADD COLUMN     "payload" JSONB,
ADD COLUMN     "started_at" TIMESTAMPTZ(6),
ALTER COLUMN "status" SET DEFAULT 'pending';

-- CreateIndex
CREATE UNIQUE INDEX "jobs_queue_job_id_key" ON "jobs"("queue", "job_id");

