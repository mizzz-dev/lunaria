import { fetch } from 'undici';
import type { DiscordPartialGuild } from '@lunaria/types';

const DISCORD_API_BASE = 'https://discord.com/api/v10';

function getClientId(): string {
  const id = process.env['DISCORD_CLIENT_ID'];
  if (!id) throw new Error('DISCORD_CLIENT_ID is not set');
  return id;
}

function getClientSecret(): string {
  const secret = process.env['DISCORD_CLIENT_SECRET'];
  if (!secret) throw new Error('DISCORD_CLIENT_SECRET is not set');
  return secret;
}

function getRedirectUri(): string {
  const uri = process.env['DISCORD_REDIRECT_URI'];
  if (!uri) throw new Error('DISCORD_REDIRECT_URI is not set');
  return uri;
}

export function getDiscordOAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: 'identify email guilds',
    state,
  });
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const body = new URLSearchParams({
    client_id: getClientId(),
    client_secret: getClientSecret(),
    grant_type: 'authorization_code',
    code,
    redirect_uri: getRedirectUri(),
  });

  const response = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Discord token exchange failed: ${response.status} ${text}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  return data;
}

export async function getDiscordUser(accessToken: string): Promise<{
  id: string;
  username: string;
  discriminator: string;
  global_name: string | null;
  avatar: string | null;
  email: string | null;
}> {
  const response = await fetch(`${DISCORD_API_BASE}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Discord user: ${response.status}`);
  }

  const data = (await response.json()) as {
    id: string;
    username: string;
    discriminator: string;
    global_name: string | null;
    avatar: string | null;
    email: string | null;
  };
  return data;
}

export async function getDiscordGuilds(accessToken: string): Promise<DiscordPartialGuild[]> {
  const response = await fetch(`${DISCORD_API_BASE}/users/@me/guilds`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Discord guilds: ${response.status}`);
  }

  const data = (await response.json()) as DiscordPartialGuild[];
  return data;
}
