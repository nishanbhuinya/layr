## A video with a poster

Video plays a video with the browser's controls. `poster` shows an image until it plays, `captions` adds a subtitles track, and `fit` sets how the video fills its box. `autoplay` always starts muted, because browsers only autoplay silent video.

```layr
Video(
  .config(
    w: fill
    maxW: 480
    aspect: 1.78
    cornerRadius: 14
    fit: cover
    poster: '/og.png'
    src: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'
  )
)
```

> **Try it**
> - Add `autoplay: true, loop: true`: it plays silently on repeat.
> - Add `controls: false` for a background video.
