import logging
import re
import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

YOUTUBE_PATTERN = re.compile(
    r"(?:youtube\.com/watch\?v=|youtu\.be/)([A-Za-z0-9_-]{11})"
)


async def parse(url: str) -> dict:
    """
    URL에서 제목과 설명을 파싱.
    YouTube: oEmbed API 사용.
    일반 웹: og:title / og:description / <title> 태그 추출.
    """
    if _is_youtube(url):
        return await _parse_youtube(url)
    return await _parse_webpage(url)


def _is_youtube(url: str) -> bool:
    return bool(YOUTUBE_PATTERN.search(url))


async def _parse_youtube(url: str) -> dict:
    """YouTube oEmbed API로 제목/저자 추출"""
    oembed_url = f"https://www.youtube.com/oembed?url={url}&format=json"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(oembed_url)
            resp.raise_for_status()
            data = resp.json()
            return {
                "title": data.get("title", ""),
                "description": f"YouTube 영상: {data.get('author_name', '')}",
            }
    except Exception as exc:
        logger.warning("YouTube oEmbed 파싱 실패: %s", exc)
        return {"title": url, "description": ""}


async def _parse_webpage(url: str) -> dict:
    """일반 웹페이지 og:title / og:description 파싱"""
    headers = {"User-Agent": "Mozilla/5.0 (Memolish bot)"}
    try:
        async with httpx.AsyncClient(timeout=5.0, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")

            title = (
                _og(soup, "og:title")
                or (soup.title.string.strip() if soup.title else "")
            )
            description = (
                _og(soup, "og:description")
                or _meta(soup, "description")
                or ""
            )
            return {"title": title[:512], "description": description[:1000]}
    except Exception as exc:
        logger.warning("웹페이지 파싱 실패 (%s): %s", url, exc)
        return {"title": url, "description": ""}


def _og(soup: BeautifulSoup, property_name: str) -> str:
    tag = soup.find("meta", property=property_name)
    return tag["content"].strip() if tag and tag.get("content") else ""


def _meta(soup: BeautifulSoup, name: str) -> str:
    tag = soup.find("meta", attrs={"name": name})
    return tag["content"].strip() if tag and tag.get("content") else ""
