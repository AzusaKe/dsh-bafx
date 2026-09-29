# Third-Party Notices

`dsh-bafx` itself is licensed under the MIT License — see [`LICENSE`](./LICENSE),
Copyright (c) 2026 AzusaKe.

This package redistributes and depends on the following third-party software.
The notices below are reproduced to satisfy their license terms.

> **Unofficial project.** `dsh-bafx` is a community plugin with no affiliation
> to, endorsement by, or sponsorship from NEXON Games, Yostar, or the Blue
> Archive project. "Blue Archive" and its assets are trademarks and copyrights
> of their respective owners. The upstream effect library is a parameter-level
> port of the game's `FX_Touch`; the MIT license covers **code only**. If a
> rights holder objects, the relevant content will be adjusted or removed.

---

## 1. ba-click-fx (redistributed source)

`lib/bafx-src/*.js` is a verbatim copy of the `src/` ES modules of
**ba-click-fx v1.3.1** (25 modules), redistributed unmodified.

- Upstream: <https://github.com/CialloKing/ba-click-fx>
- License: MIT
- Copyright (c) 2026 CialloKing

```text
MIT License

Copyright (c) 2026 CialloKing

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 2. BASpark and BA-Spark-Cursor (attribution chain carried by upstream)

Upstream ba-click-fx states that its early versions were developed with
reference to the implementation, parameters, and visual behavior of these
MIT-licensed projects. Its `THIRD_PARTY_NOTICES.md` requires this notice to be
retained, so it is reproduced here.

- **BASpark** — maintained at `DoomVoss/BASpark`
- **BA-Spark-Cursor** — maintained at `VanillaNahida/BA-Spark-Cursor`
  (states that its click effect originates from BASpark)
- License: MIT
- Copyright (c) 2026 Doom

```text
MIT License

Copyright (c) 2026 Doom

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 3. Not redistributed

`dsh-bafx` bundles **no** React and **no** `@deepseek-ai/*` code. The client
half obtains React through the DSH client-module loader
(`require('react')`, a platform-provided seed), and the host half uses only
Node built-ins. Those packages are provided by the DeepSeek Harness
installation and remain under their own licenses.
