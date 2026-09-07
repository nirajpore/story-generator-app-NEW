import { POST as storyPost } from '@/app/api/story/route';

export async function POST(request) {
  return storyPost(request);
}
