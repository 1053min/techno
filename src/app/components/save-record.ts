import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });

  try {
    const { record } = req.body;
    
    // Vercel 환경 변수에서 GitHub 정보 가져오기
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // GitHub Personal Access Token
    const GITHUB_OWNER = process.env.GITHUB_OWNER; // GitHub 닉네임 (예: 1053m)
    const GITHUB_REPO = process.env.GITHUB_REPO;   // 레포지토리 이름 (예: running-app-mvp)

    if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
      return res.status(500).json({ error: 'GitHub 환경변수가 설정되지 않았습니다.' });
    }

    const timestamp = new Date().getTime();
    const path = `data/records/record_${timestamp}.json`; // 저장될 경로와 파일명
    const content = Buffer.from(JSON.stringify(record, null, 2)).toString('base64'); // GitHub API는 Base64 인코딩을 요구함

    const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `Add route record ${timestamp} for AI training`,
        content: content,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message);
    }

    return res.status(200).json({ success: true, path });
  } catch (error: any) {
    console.error('GitHub API 에러:', error);
    return res.status(500).json({ error: error.message });
  }
}