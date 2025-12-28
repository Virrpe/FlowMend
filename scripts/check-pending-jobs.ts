#!/usr/bin/env tsx
import {PrismaClient} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const jobs = await prisma.job.findMany({
    where: {status: {in: ['PENDING', 'RUNNING']}},
    select: {id: true, status: true, createdAt: true, queryString: true}
  });

  console.log(`Found ${jobs.length} pending/running jobs:\n`);
  for (const j of jobs) {
    console.log(`  ${j.id}`);
    console.log(`    Status: ${j.status}`);
    console.log(`    Query: ${j.queryString}`);
    console.log(`    Created: ${j.createdAt.toISOString()}\n`);
  }

  await prisma.$disconnect();
}

main();
