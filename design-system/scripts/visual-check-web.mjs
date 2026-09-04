#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium } from 'playwright';

const baseUrl = process.env.DFLH_WEB_BASE_URL ?? 'http://127.0.0.1:4173';
const runMode = (process.env.DFLH_WEB_VISUAL_MODE ?? 'guard').toLowerCase();
const baselineDir = path.join(process.cwd(), 'design-system', 'verification', 'web-snapshots', 'baseline');
const currentDir = path.join(process.cwd(), 'design-system', 'verification', 'web-snapshots', 'design');
const reportPath = path.join(process.cwd(), 'design-system', 'verification', 'reports', 'visual-check-web.json');
const acceptedDeltaPath = path.join(process.cwd(), 'design-system', 'verification', 'reports', 'accepted-deltas.json');
const maxChangedPixelRatio = Number.parseFloat(process.env.DFLH_WEB_MAX_CHANGED_PIXEL_RATIO ?? '0.002');
const pixelThreshold = Number.parseInt(process.env.DFLH_WEB_PIXEL_THRESHOLD ?? '8', 10);
const useApiFixtures = process.env.DFLH_WEB_USE_API_FIXTURES !== '0';

const routes = [
  { name: 'feed', path: '/' },
  { name: 'messages', path: '/messages' },
  { name: 'mypage', path: '/mypage' },
  { name: 'messages_thread', path: '/messages/1' },
];

const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

await fs.promises.mkdir(currentDir, { recursive: true });
await fs.promises.mkdir(baselineDir, { recursive: true });
await fs.promises.mkdir(path.dirname(reportPath), { recursive: true });

const accepted = loadAcceptedDeltas();
var visualUser;
var visualProfile;
var visualHeroNotice;
var visualFeedResponse;
var visualConversations;
var visualConversationMessages;
initializeVisualFixtures();

const browser = await chromium.launch({ headless: true });
const report = {
  baseUrl,
  runMode,
  generatedAt: new Date().toISOString(),
  acceptedDeltaSource: acceptedDeltaPath,
  apiFixtures: useApiFixtures,
  pixelTolerance: {
    maxChangedPixelRatio,
    pixelThreshold,
  },
  checks: [],
};
let failureCount = 0;
let acceptedCount = 0;

for (const route of routes) {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    const fileBase = `${route.name}-${viewport.name}.png`;
    const baselinePath = path.join(baselineDir, fileBase);
    const currentPath = path.join(currentDir, fileBase);
    const url = `${baseUrl.replace(/\/$/, '')}${route.path}`;

    try {
      if (useApiFixtures) {
        await installApiFixtures(page);
      }
      await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
      await page.waitForTimeout(700);
      const shotBuffer = await page.screenshot({
        fullPage: true,
        path: currentPath,
        animations: 'disabled',
      });
      const shotHash = sha256(shotBuffer);
      const baselineExists = fs.existsSync(baselinePath);
      let baselineHash = '';

      if (runMode === 'capture') {
        baselineHash = baselineExists ? sha256(fs.readFileSync(baselinePath)) : '';
        await fs.promises.copyFile(currentPath, baselinePath);
        report.checks.push({
          route: route.name,
          path: route.path,
          viewport: viewport.name,
          status: baselineExists ? 'baseline-updated' : 'baseline-created',
          screenshot: currentPath,
          baseline: baselinePath,
          hash: shotHash,
          previousBaselineHash: baselineHash || undefined,
        });
      } else if (baselineExists) {
        baselineHash = sha256(fs.readFileSync(baselinePath));
        const comparison = shotHash === baselineHash
          ? { changedPixelRatio: 0, changedPixels: 0, totalPixels: 0 }
          : await compareImages(browser, baselinePath, currentPath);
        const visuallyMatches = shotHash === baselineHash || comparison.changedPixelRatio <= maxChangedPixelRatio;
        const status = visuallyMatches ? 'match' : 'changed';
        const acceptedDelta = status === 'changed' ? isAccepted(route.name, viewport.name, shotHash, baselineHash) : null;

        report.checks.push({
          route: route.name,
          path: route.path,
          viewport: viewport.name,
          status: acceptedDelta ? 'changed-accepted' : status,
          screenshot: currentPath,
          baseline: baselinePath,
          hash: shotHash,
          baselineHash,
          changedPixelRatio: comparison.changedPixelRatio,
          changedPixels: comparison.changedPixels,
          totalPixels: comparison.totalPixels,
          acceptedDeltaReason: acceptedDelta?.reason,
          approvedBy: acceptedDelta?.approvedBy,
          approvedAt: acceptedDelta?.approvedAt,
        });

        if (status === 'changed' && acceptedDelta == null) {
          failureCount += 1;
        }
        if (acceptedDelta) {
          acceptedCount += 1;
        }
      } else {
        report.checks.push({
          route: route.name,
          path: route.path,
          viewport: viewport.name,
          status: 'missing-baseline',
          screenshot: currentPath,
          baseline: baselinePath,
          hash: shotHash,
        });
        failureCount += 1;
      }
    } catch (error) {
      failureCount += 1;
      report.checks.push({
        route: route.name,
        path: route.path,
        viewport: viewport.name,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      await page.close();
    }
  }
}

await browser.close();

report.summary = {
  totalChecks: report.checks.length,
  changedCount: report.checks.filter((entry) => entry.status === 'changed').length,
  acceptedCount,
  missingBaselineCount: report.checks.filter((entry) => entry.status === 'missing-baseline').length,
  errorCount: report.checks.filter((entry) => entry.status === 'error').length,
};

await fs.promises.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

if (failureCount > 0) {
  console.error(`visual-check-web failed: ${failureCount} checks mismatched or errored.`);
  console.error(`report: ${reportPath}`);
  process.exit(1);
}

console.log(`visual-check-web passed. report: ${reportPath}`);
if (acceptedCount > 0) {
  console.log(`accepted deltas applied: ${acceptedCount}`);
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function compareImages(browser, baselinePath, currentPath) {
  const page = await browser.newPage();
  try {
    return await page.evaluate(
      async ({ baselineUrl, currentUrl, threshold }) => {
        const [baselineImage, currentImage] = await Promise.all([
          loadImage(baselineUrl),
          loadImage(currentUrl),
        ]);

        const width = Math.max(baselineImage.width, currentImage.width);
        const height = Math.max(baselineImage.height, currentImage.height);
        const totalPixels = width * height;
        const baselineData = drawImageData(baselineImage, width, height);
        const currentData = drawImageData(currentImage, width, height);
        let changedPixels = 0;

        for (let i = 0; i < baselineData.length; i += 4) {
          const delta =
            Math.abs(baselineData[i] - currentData[i]) +
            Math.abs(baselineData[i + 1] - currentData[i + 1]) +
            Math.abs(baselineData[i + 2] - currentData[i + 2]) +
            Math.abs(baselineData[i + 3] - currentData[i + 3]);
          if (delta > threshold) {
            changedPixels += 1;
          }
        }

        return {
          changedPixelRatio: totalPixels === 0 ? 1 : changedPixels / totalPixels,
          changedPixels,
          totalPixels,
        };

        function loadImage(src) {
          return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
            image.src = src;
          });
        }

        function drawImageData(image, width, height) {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext('2d');
          context.drawImage(image, 0, 0);
          return context.getImageData(0, 0, width, height).data;
        }
      },
      {
        baselineUrl: imageDataUrl(baselinePath),
        currentUrl: imageDataUrl(currentPath),
        threshold: pixelThreshold,
      },
    );
  } finally {
    await page.close();
  }
}

function imageDataUrl(filePath) {
  const encoded = fs.readFileSync(filePath).toString('base64');
  return `data:image/png;base64,${encoded}`;
}

function loadAcceptedDeltas() {
  if (!fs.existsSync(acceptedDeltaPath)) {
    return [];
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(acceptedDeltaPath, 'utf8'));
    return Array.isArray(parsed) ? parsed : parsed?.entries ?? [];
  } catch {
    return [];
  }
}

function isAccepted(route, viewport, hash, baselineHash) {
  return accepted.find((entry) => {
    if (!entry) return false;
    const routeMatch = entry.route === route;
    const viewportMatch = entry.viewport === viewport;
    const hashMatch = entry.hash ? entry.hash === hash : true;
    const baselineMatch = entry.baselineHash ? entry.baselineHash === baselineHash : true;
    return routeMatch && viewportMatch && hashMatch && baselineMatch;
  }) ?? null;
}

async function installApiFixtures(page) {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathName = url.pathname;

    if (request.method() !== 'GET') {
      await route.fulfill({ status: 204, body: '' });
      return;
    }

    if (pathName === '/api/messages/stream') {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: 'event: ready\ndata: {}\n\n',
      });
      return;
    }

    const body = apiFixtureFor(pathName);
    if (body == null) {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'VISUAL_FIXTURE_NOT_FOUND', message: pathName }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
}

function apiFixtureFor(pathName) {
  if (pathName === '/api/auth/me') {
    return visualUser;
  }
  if (pathName === '/api/profile') {
    return visualProfile;
  }
  if (pathName === '/api/badges') {
    return { unreadMessages: 2, unreadNotifications: 0 };
  }
  if (pathName === '/api/feed/hero') {
    return visualHeroNotice;
  }
  if (pathName === '/api/feed') {
    return visualFeedResponse;
  }
  if (pathName === '/api/alumni/widget') {
    return {
      totalCount: 1842,
      items: [{ fmName: '김민준' }, { fmName: '이지원' }, { fmName: '박서연' }],
    };
  }
  if (pathName === '/api/donation/summary') {
    return {
      totalAmount: 186500000,
      manualAdj: 0,
      displayAmount: 186500000,
      donorCount: 428,
      goalAmount: 300000000,
      achievementRate: 62,
      snapshotDate: '2026-06-12',
    };
  }
  if (pathName === '/api/messages/conversations') {
    return visualConversations;
  }
  if (pathName === '/api/messages/conversations/1') {
    return visualConversationMessages;
  }
  return null;
}

function initializeVisualFixtures() {
visualUser = {
  usrSeq: 9001,
  usrId: 'visual.user',
  usrName: '김다일',
  usrStatus: 'ACTIVE',
};

visualProfile = {
  usrSeq: 9001,
  usrName: '김다일',
  usrNick: '다일',
  usrPhone: '010-1234-5678',
  usrEmail: 'visual@daeilfoundation.or.kr',
  usrFn: '38',
  usrPhoto: null,
  bizName: '대일 글로벌 네트워크',
  bizDesc: '동문 장학회 운영과 후배 멘토링 프로그램을 함께 지원하고 있습니다.',
  bizAddr: '서울특별시 성북구',
  position: '운영위원',
  jobCat: 1,
  jobCatName: '교육/공익',
  tags: ['장학', '멘토링', '동문네트워크'],
  fmDept: '영어과',
  regDate: '2026.06.12',
  usrPhonePublic: 'N',
  usrEmailPublic: 'Y',
  usrBizCard: null,
  hasPassword: true,
  hasSocialLogin: true,
};

visualHeroNotice = {
  seq: 101,
  subject: '2026 장학회 뉴스피드 디자인 시스템 기준 공지',
  summary: '뉴스피드, 쪽지, 마이페이지가 같은 토큰 언어로 보이도록 기준 화면을 고정합니다.',
  thumbnailUrl: null,
  regDate: '2026-06-12T09:00:00',
  regName: '장학회',
  hit: 1280,
  likeCnt: 84,
  commentCnt: 12,
  isPinned: 'Y',
};

visualFeedResponse = {
  items: [
    {
      type: 'notice',
      seq: 102,
      subject: '동문 멘토링 신청 안내',
      summary: '진로 상담과 대학 생활 경험을 나누는 멘토링 프로그램 신청을 시작합니다.',
      thumbnailUrl: null,
      regDate: '2026-06-11T16:30:00',
      regName: '운영팀',
      hit: 612,
      likeCnt: 45,
      commentCnt: 8,
      isPinned: 'N',
      userLiked: true,
      category: '공지',
    },
    {
      type: 'notice',
      seq: 103,
      subject: '장학생 인터뷰: 후배에게 보내는 편지',
      summary: '올해 장학생들이 전하는 감사 인사와 앞으로의 계획을 소개합니다.',
      thumbnailUrl: null,
      regDate: '2026-06-10T11:20:00',
      regName: '홍보팀',
      hit: 438,
      likeCnt: 37,
      commentCnt: 5,
      isPinned: 'N',
      userLiked: false,
      category: '소식',
    },
    {
      type: 'notice',
      seq: 104,
      subject: '기부금 사용 내역 공개',
      summary: '2026년 상반기 장학금 집행 내역과 다음 분기 계획을 공유합니다.',
      thumbnailUrl: null,
      regDate: '2026-06-09T14:10:00',
      regName: '재무팀',
      hit: 529,
      likeCnt: 29,
      commentCnt: 3,
      isPinned: 'N',
      userLiked: false,
      category: '공시',
    },
  ],
  nextCursor: '',
  hasMore: false,
};

visualConversations = {
  items: [
    {
      otherSeq: 1,
      otherName: '이지원',
      lastMessage: '이번 주 멘토링 자료 확인했습니다. 감사합니다.',
      lastDate: '2026-06-12T08:45:00',
      unreadCount: 2,
    },
    {
      otherSeq: 2,
      otherName: '박서연',
      lastMessage: '장학금 수여식 일정 공유드립니다.',
      lastDate: '2026-06-11T18:20:00',
      unreadCount: 0,
    },
    {
      otherSeq: 3,
      otherName: '최민호',
      lastMessage: '후배 소개 자료를 업데이트했습니다.',
      lastDate: '2026-06-10T10:05:00',
      unreadCount: 1,
    },
  ],
};

visualConversationMessages = {
  items: [
    {
      amSeq: 501,
      senderSeq: 1,
      recvrSeq: 9001,
      content: '안녕하세요. 멘토링 자료 초안을 먼저 보내드립니다.',
      readYn: 'Y',
      regDate: '2026-06-12T08:30:00',
      readDate: '2026-06-12T08:31:00',
      senderName: '이지원',
      recvrName: '김다일',
    },
    {
      amSeq: 502,
      senderSeq: 9001,
      recvrSeq: 1,
      content: '확인했습니다. 학생들이 바로 이해할 수 있게 사례를 조금 더 넣어보겠습니다.',
      readYn: 'Y',
      regDate: '2026-06-12T08:36:00',
      readDate: '2026-06-12T08:39:00',
      senderName: '김다일',
      recvrName: '이지원',
    },
    {
      amSeq: 503,
      senderSeq: 1,
      recvrSeq: 9001,
      content: '좋습니다. 완성본은 오후 회의 전에 공유하겠습니다.',
      readYn: 'N',
      regDate: '2026-06-12T08:45:00',
      readDate: '',
      senderName: '이지원',
      recvrName: '김다일',
    },
  ],
  totalCount: 3,
  page: 1,
  size: 30,
  totalPages: 1,
};
}
