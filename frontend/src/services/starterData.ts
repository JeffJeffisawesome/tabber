import type { GuitarTab } from '../types/api';

const now = new Date().toISOString();

export const STARTER_TABS: GuitarTab[] = [
  {
    id: 1,
    title: 'Take Me Home, Country Roads',
    artist: 'John Denver',
    tuning: 'Standard (E A D G B E)',
    capo: 2,
    difficulty: 'Beginner',
    content: `[Verse 1]
[G]Almost heaven, [Em]West Virginia
[D]Blue Ridge Mountains, [C]Shenandoah [G]River
[G]Life is old there, [Em]older than the trees
[D]Younger than the mountains, [C]growin' like a [G]breeze

[Chorus]
Country [G]roads, take me [D]home
To the [Em]place I be[C]long
West Vir[G]ginia, mountain [D]mama
Take me [C]home, country [G]roads

[Verse 2]
[G]All my memories [Em]gather 'round her
[D]Miner's lady, [C]stranger to blue [G]water
[G]Dark and dusty, [Em]painted on the sky
[D]Misty taste of moonshine, [C]teardrop in my [G]eye

[Bridge]
[Em]I hear her [D]voice in the [G]mornin' hour, she calls me
The [C]radio re[G]minds me of my [D]home far away
And [Em]drivin' down the [F]road, I get a [C]feelin'
That I [G]should have been home [D]yesterday, yester[D7]day
`,
    is_favorite: true,
    created_at: now,
    updated_at: now,
  },
  {
    id: 2,
    title: "Knockin' on Heaven's Door",
    artist: 'Bob Dylan',
    tuning: 'Standard (E A D G B E)',
    capo: 0,
    difficulty: 'Beginner',
    content: `[Intro]
[G]   [D]   [Am]
[G]   [D]   [C]

[Verse 1]
[G]Mama, take this [D]badge off of [Am]me
[G]I can't [D]use it any[C]more
[G]It's gettin' [D]dark, too dark to [Am]see
[G]I feel I'm [D]knockin' on heaven's [C]door

[Chorus]
[G]Knock, knock, [D]knockin' on heaven's [Am]door
[G]Knock, knock, [D]knockin' on heaven's [C]door
[G]Knock, knock, [D]knockin' on heaven's [Am]door
[G]Knock, knock, [D]knockin' on heaven's [C]door
`,
    is_favorite: true,
    created_at: now,
    updated_at: now,
  },
  {
    id: 3,
    title: 'Wish You Were Here (Intro)',
    artist: 'Pink Floyd',
    tuning: 'Standard (E A D G B E)',
    capo: 0,
    difficulty: 'Beginner',
    content: `[Intro Acoustic Riff]

   Em7                  G
e|-------------------|-------------------|
B|-------3-----------|-------3-----------|
G|-------0-----------|-------0-----------|
D|---0h2---2p0-------|---0h2---2p0-------|
A|-------------2-----|-------------2-----|
E|-------------------|---------------3---|

   Em7                  A7sus4
e|-------------------|-------------------|
B|-------3-----------|-------3-----------|
G|-------0-----------|-------0-----------|
D|---0h2---2p0-------|---0h2---2p0-------|
A|-------------2-----|-------------0-----|
E|-------------------|-------------------|

   Em7                  G
e|-------------------|-------------------|
B|-------3-----------|-------3-----------|
G|-------0-----------|-------0-----------|
D|---0h2---2p0-------|---0h2---2p0-------|
A|-------------2-----|-------------------|
E|-------------------|---3---------------|

[Verse]
So, [C]so you think you can [D]tell
Heaven from [Am]hell, blue skies from [G]pain
Can you tell a green [D]field from a cold steel [C]rail?
A smile from a [Am]veil? Do you think you can [G]tell?
`,
    is_favorite: true,
    created_at: now,
    updated_at: now,
  },
  {
    id: 4,
    title: 'Blackbird (Intro)',
    artist: 'The Beatles',
    tuning: 'Standard (E A D G B E)',
    capo: 0,
    difficulty: 'Intermediate',
    content: `[Intro - Fingerstyle]

   G                 Am7               G/B
e|-------|---------|-------|---------|-------|---------|
B|---0---|-----0---|---1---|-----1---|---3---|-----3---|
G|-------|---0-----|-------|---0-----|-------|---0-----|
D|-------|---------|-------|---------|-------|---------|
A|-------|---------|---0---|---------|---2---|---------|
E|---3---|---------|-------|---------|-------|---------|

   G                     C
e|-------|-------------|-------|---------|
B|--12---|------12-----|---5---|-----5---|
G|-------|---0---------|-------|---0-----|
D|-------|-------------|-------|---------|
A|--10---|-------------|---3---|---------|
E|-------|-------------|-------|---------|
`,
    is_favorite: true,
    created_at: now,
    updated_at: now,
  },
];

