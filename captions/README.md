# make_captions

Turns your script into the Edge TTS narration plus word-synced meme captions. It runs on your PC, with no AI and no tokens.

## One-time setup (Windows)
1. Install Python from python.org (tick "Add python.exe to PATH").
2. In a terminal: `pip install edge-tts`
3. Install ffmpeg: `winget install ffmpeg`, then open a new terminal.

## Which file to drag
- **Already have the voice** (e.g. `pineapple\voice_final.mp3` from `make_voice.py`): drag that folder's **`word_timings.csv`** onto `make_captions.bat`.
  The captions follow the exact timing of your existing voice. Spelling, `?`/`!` and `*highlights*` come from the `*_script.md` in the same folder.
  It writes `word_timings.ass` and `word_timings.srt` next to the CSV. No new voice is made.
- **New story, no voice yet:** drag the script (`.md` or `.txt`). The script makes the Edge voice and the captions together.

## Use (new voice)
Drag your script onto `make_captions.bat`, or run:

    python make_captions.py freeze_script.md --highlight-words Theo,Patel,Dong

You get, next to the script:
- `freeze_script.mp3`: the narration
- `freeze_script.ass`: styled captions (one word at a time, white with a black outline, highlighted words in yellow, a small pop)
- `freeze_script.srt`: plain captions, for any editor that imports SRT
- `freeze_script_words.json`: the word timings (also useful for the shot list)

## Getting the captions onto the video (automatic)
1. Edit in Filmora as usual, with the narration starting at 0:00. Don't add captions.
2. Export the video.
3. Select **both** `word_timings.csv` and the exported video, and drag them onto `make_captions.bat` together.

You get `<video name>_captioned.mp4` next to the export, with the captions burned in and the audio untouched.
If the voice starts later than 0:00 in your edit, run it with `--offset 0.5` (seconds) instead:

    python make_captions.py pineapple\word_timings.csv pineapple_export.mp4 --offset 0.5

Prefer to style the captions inside Filmora? Import the `.srt` there (File > Import > Import Media) instead. It has the right timing, but you'll need to do the styling in Filmora.

## Script markup
- `*word*` or `*two words*` shows those words in the highlight color.
- Numbers and times (212, 11:55) are highlighted automatically.
- `--highlight-words Theo,Patel` always highlights those names (including "Theo's").
- `[pause]` or `[pause 0.8]` adds a silent gap.
- These lines are skipped: `#` headings, `---`, whole-line `**BOLD**` section headers, `**Label:**` note lines, and `- ` bullet lists.

## Handy options
| Option | Default | What it does |
|---|---|---|
| `--voice` | en-US-BrianMultilingualNeural | any Edge voice, e.g. en-US-AndrewMultilingualNeural |
| `--rate` | +0% | speaking speed, e.g. `+10%` |
| `--pitch` | +0Hz | Edge pitch, e.g. `+20Hz` |
| `--semitones` | 0 | pitch-up after TTS without changing timing (try 5 to 6 for your pitched-up Brian) |
| `--words` | 1 | words on screen at once; 2 or 3 highlights the spoken word |
| `--font` / `--size` | Arial Black / 110 | caption font and size |
| `--fontsdir` | | folder with .ttf files, e.g. Montserrat Black |
| `--highlight` | FFE600 | highlight color (RGB hex) |
| `--y` | 0.68 | caption height as a fraction of the frame |
| `--upper` | off | ALL CAPS |
| `--no-pop` | | turn off the pop animation |

To change the defaults permanently, edit the `DEFAULTS` block at the top of `make_captions.py`.
