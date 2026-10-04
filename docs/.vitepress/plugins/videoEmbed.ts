const EMBED_REGEX = /@\[(.*?)\]\((https?:\/\/[^\s)]+)\)/

function getYoutubeId(url: string): string | null {
    const match = url.match(
        /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^?&/#]+)/
    )

    return match?.[1] ?? null
}

export function videoEmbed(md: any) {
    md.inline.ruler.before('link', 'video-embed', (state, silent) => {
        const match = EMBED_REGEX.exec(state.src.slice(state.pos))

        if (!match) {
            return false
        }

        if (!silent) {
            const token = state.push('video_embed', '', 0)

            token.meta = {
                title: match[1],
                url: match[2],
            }
        }

        state.pos += match[0].length

        return true
    })

    md.renderer.rules.video_embed = (tokens, idx) => {
        const { title, url } = tokens[idx].meta

        const youtubeId = getYoutubeId(url)

        if (!youtubeId) {
            return `
<figure class="video-embed">
  <a href="${url}" target="_blank" rel="noopener noreferrer">${title}</a>
</figure>
`
        }

        return `
<figure class="video-embed">
    <iframe
      src="https://www.youtube.com/embed/${youtubeId}"
      title="${title}"
      frameborder="0"
      allowfullscreen
    ></iframe>
  ${title ? `<figcaption>${md.utils.escapeHtml(title)}</figcaption>` : ''}
</figure>
`
    }
    md.core.ruler.push('unwrap-video-embed', (state) => {
        const tokens = state.tokens

        for (let i = 0; i < tokens.length - 2; i++) {
            if (
                tokens[i].type === 'paragraph_open' &&
                tokens[i + 1].type === 'inline' &&
                tokens[i + 2].type === 'paragraph_close'
            ) {
                const children = tokens[i + 1].children ?? []

                const hasOnlyVideo =
                    children.length > 0 &&
                    children.every(
                        c =>
                            c.type === 'video_embed' ||
                            (c.type === 'text' && !c.content.trim())
                    )

                if (hasOnlyVideo) {
                    tokens[i].hidden = true
                    tokens[i + 2].hidden = true
                }
            }
        }
    })
}