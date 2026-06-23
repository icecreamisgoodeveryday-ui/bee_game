function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ── Line pools (all under ~40 chars for bubble width) ──────────────────────
const LINES = {
  happy: [
    "Life is bee-utiful today!",
    "I'm buzzin with pure joy!",
    "Bee yourself, honey!",
    "What a day to be a bee!",
    "Colony life is the bee's knees!",
    "I'm bee-yond happy right now!",
    "Pollen season is the BEST!",
    "Everything is coming up honeycomb!",
  ],
  content: [
    "Just buzzin around the block!",
    "Not bad for a bee!",
    "Could be worse — could be a wasp.",
    "Living the sweet life~",
    "Bee-ing alive is pretty great!",
    "Just another day in the colony.",
    "Eh, I've had worse days!",
    "Keeping calm and carrying pollen.",
  ],
  mad: [
    "Not in the mood to buzz around!",
    "Don't test me today...",
    "I am SEETHING right now.",
    "One more thing and I sting someone.",
    "I'm FUMING. Absolutely fuming.",
    "This is NOT my day.",
  ],
  tired: [
    "Zzz... I mean... buzz...",
    "I'm bee-xhausted...",
    "My wings are so heavy...",
    "Running on empty over here.",
    "I need a nap in the comb.",
    "Too tired to even make a pun.",
  ],
  hungry: [
    "I'd trade my stinger for nectar.",
    "My honey stomach is EMPTY.",
    "Has anyone seen the flower beds?!",
    "Buzzing on fumes here...",
    "Haven't eaten since the last bloom!",
  ],
  thirsty: [
    "I'm parched as a desert flower.",
    "My proboscis is so dry right now.",
    "Water... nectar... anything!!",
    "I'd swap my wings for one sip.",
  ],
  desperate: [
    "BATHROOM BREAK — URGENT!!",
    "Nature is calling!! MOVE!!",
    "NOT OKAY RIGHT NOW!!",
    "GOTTA GO GOTTA GO GOTTA GO!!",
    "I am in a CRISIS right now!!",
  ],
  bored: [
    "There's nothing to do...",
    "Is this all there is to beeing?",
    "I've counted every pebble here.",
    "Someone give me something to do!",
    "Yep. Still bored. Still here.",
    "Even watching dirt is more fun.",
  ],
  tax_warning: [
    "Tax season is coming... yikes.",
    "I haven't saved enough! Oh no.",
    "The taxman is almost here!!",
    "Better hide my beebucks...",
    "Taxes?? In THIS economy??",
    "I need my bee-ccountant NOW.",
    "Should I even check my balance?",
    "TAX SEASON?! Not again!!",
    "I spent it all... uh oh.",
    "Every bee for themselves!!",
    "I can't afford this right now!",
    "My antennae are sweating...",
  ],
  unwell: [
    "I don't feel so good...",
    "I got into some bad pollen...",
    "Someone call the bee-tor...",
    "My wings feel so heavy today...",
    "I need to lie down in the comb.",
  ],
  farmer_normal: [
    "The harvest looks great today!",
    "Nothing beats fresh crops!",
    "Farming is in my bee blood!",
    "These crops won't grow themselves!",
    "An honest day's work for a bee!",
    "I love the smell of pollen at dawn.",
  ],
  farmer_payday: [
    "Buzzing with excitement — payday soon!",
    "I can almost taste the honey!",
    "Counting down the seconds to payday!",
    "Soon I'll be rolling in beebucks!",
    "Payday vibes are SO real today!",
    "My antennae are TINGLING — payday!",
    "Working extra hard with payday near!",
  ],
  builder_normal: [
    "Every hive starts with one cell!",
    "Built that with my own six legs!",
    "Construction is an art form, honey!",
    "These hexagons won't build themselves!",
    "A bee's work is never done!",
    "I measure twice, sting once.",
  ],
  jobless: [
    "Anyone got work for a bee?",
    "Just a bee between careers.",
    "The job market is rough out here.",
    "I heard the farm is hiring...",
    "Free as a bee, I suppose...",
    "Just looking for purpose out here.",
    "One day I'll find my calling.",
  ],
  greeting: [
    "What's buzzin?",
    "Hey honey!",
    "Bee seeing you around!",
    "How's the pollen treating you?",
    "Fancy meeting you here!",
    "You look bee-utiful today!",
    "Great day to be a bee, right?",
    "Stay sweet, friend!",
    "Hive five!",
    "Well, sting my wings — it's you!",
  ],
  stranger_greeting: [
    "...Hi.",
    "Oh. Hello.",
    "I don't think we've met...",
    "Um... nice weather for bees?",
    "So uh... you're a bee too.",
    "...Is this your pollen?",
    "We should... talk sometime.",
    "Right. Okay. Bye then.",
  ],
  friend_greeting: [
    "MY FAVORITE BEE!! HI!!",
    "You again! Never gets old!",
    "I saved you some pollen!!",
    "Best day — I saw you!",
    "Finally, someone worth buzzing to!",
    "BFF spotted!! HI HI HI!!",
    "You make the colony so much better.",
    "I was JUST thinking about you!",
    "You're basically my favorite person.",
    "Oh thank pollen, it's YOU.",
  ],
};

// ── Relationship system ────────────────────────────────────────────────────
function getRelScore(a, b) {
  return (a.relationships && a.relationships[b.id]) || 0;
}

function getRelationship(a, b) {
  const s = getRelScore(a, b);
  if (s >= 32) return 'friend';
  if (s >= 12) return 'acquaintance';
  return 'stranger';
}

function buildRelationship(a, b, amount) {
  if (!a.relationships) a.relationships = {};
  if (!b.relationships) b.relationships = {};
  a.relationships[b.id] = Math.min(100, (a.relationships[b.id] || 0) + amount);
  b.relationships[a.id] = Math.min(100, (b.relationships[a.id] || 0) + amount);
}

// ── Mood detection ─────────────────────────────────────────────────────────
function getMood(bee) {
  const { hunger, thirst, bathroom, energy, boredom } = bee.needs;
  if (bathroom > 78) return 'desperate';
  if (bathroom > 60 && boredom > 55) return 'mad';
  if (energy < 22)   return 'tired';
  if (hunger < 28)   return 'hungry';
  if (thirst < 28)   return 'thirsty';
  if (boredom > 72)  return 'bored';
  if (boredom > 55 && energy < 35) return 'mad';
  if (bee.health < 40) return 'unwell';
  if (hunger > 78 && energy > 72 && boredom < 35) return 'happy';
  return 'content';
}

function getBeeDialogue(bee) {
  const mood = getMood(bee);

  // Tax warning overrides everything except true emergencies
  if (typeof taxTimer !== 'undefined' && taxTimer <= 300 && Math.random() < 0.55) {
    if (!['desperate'].includes(mood)) return pick(LINES.tax_warning);
  }

  // Urgent moods override everything
  if (['desperate', 'mad', 'tired', 'hungry', 'thirsty', 'bored', 'unwell'].includes(mood)) {
    return pick(LINES[mood]);
  }

  if (bee.job === 'farmer') {
    // Near payday = last 180 seconds of the 900s cycle
    if (FARMER_PAY_INTERVAL - farmerPayTimer < 180) return pick(LINES.farmer_payday);
    return pick([...LINES.farmer_normal, ...LINES[mood]]);
  }
  if (bee.job === 'builder') return pick([...LINES.builder_normal, ...LINES[mood]]);
  if (!bee.job)              return pick([...LINES.jobless, ...LINES[mood]]);
  return pick(LINES[mood]);
}

// ── Speech bubble drawing ──────────────────────────────────────────────────
const POP_IN  = 0.28; // seconds to pop in
const POP_OUT = 0.28; // seconds to pop out

function drawSpeechBubble(bee, text, timer, dur) {
  const elapsed = dur - timer;

  // Pop-in scale: 0 → 1.15 → 1.0 over POP_IN seconds
  let scale = 1;
  if (elapsed < POP_IN) {
    const p = elapsed / POP_IN;           // 0 → 1
    if (p < 0.65) scale = (p / 0.65) * 1.15;                     // grow to 1.15
    else          scale = 1.15 - ((p - 0.65) / 0.35) * 0.15;     // settle to 1.0
  } else if (timer < POP_OUT) {
    scale = (timer / POP_OUT) * 0.9 + 0.1; // shrink to 0.1 then blink out
  }

  const alpha = elapsed < POP_IN  ? Math.min(1, elapsed / POP_IN * 2)
              : timer   < POP_OUT ? timer / POP_OUT
              : 1;

  ctx.save();
  ctx.globalAlpha = alpha;

  ctx.font = '6px monospace';
  const tw    = ctx.measureText(text).width;
  const pw    = tw + 10, ph = 12;
  const bx    = bee.x;
  const tailY = bee.y - 20;
  const px    = Math.max(2, Math.min(W - pw - 2, bx - pw / 2));
  const py    = Math.max(2, tailY - ph - 4);
  const tailX = Math.max(px + 5, Math.min(px + pw - 5, bx));
  const midX  = px + pw / 2;

  // Scale the entire bubble+tail from the tail anchor point
  ctx.translate(tailX, tailY);
  ctx.scale(scale, scale);
  ctx.translate(-tailX, -tailY);

  // Bubble fill
  ctx.fillStyle = '#fffde8';
  roundRect(px, py, pw, ph, 3);
  ctx.fill();
  ctx.strokeStyle = '#c8a030';
  ctx.lineWidth = 0.8;
  roundRect(px, py, pw, ph, 3);
  ctx.stroke();

  // Tail
  ctx.fillStyle = '#fffde8';
  ctx.beginPath();
  ctx.moveTo(tailX - 3, py + ph);
  ctx.lineTo(tailX + 3, py + ph);
  ctx.lineTo(tailX, tailY);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#c8a030';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(tailX - 3, py + ph);
  ctx.lineTo(tailX, tailY);
  ctx.lineTo(tailX + 3, py + ph);
  ctx.stroke();

  // Text
  ctx.fillStyle = '#3a2800';
  ctx.font = '6px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(text, midX, py + 8.5);

  ctx.restore();
}

function drawAllSpeechBubbles() {
  npcs.forEach(b => {
    if (!b.speech) return;
    drawSpeechBubble(b, b.speech.text, b.speech.timer, b.speech.dur);
  });
}

// ── Passive interactions ───────────────────────────────────────────────────
const PASSIVE_MIN  = 22; // seconds
const PASSIVE_MAX  = 55;
const SPEECH_DUR   = 3.8;
const GREET_RANGE  = 38;

function tickDialogue(dt) {
  npcs.forEach(b => {
    if (b.speech) {
      b.speech.timer -= dt;
      if (b.speech.timer <= 0) { b.speech = null; b._talkingTo = null; }
    }

    // Listener timer
    if (b._listenTimer > 0) {
      b._listenTimer -= dt;
      if (b._listenTimer <= 0) b._listenTarget = null;
    }

    b.passiveTimer -= dt;
    if (b.passiveTimer <= 0) {
      b.passiveTimer = PASSIVE_MIN + Math.random() * (PASSIVE_MAX - PASSIVE_MIN);
      if (!b.speech) {
        // React to nearby poop (highest passive priority)
        if (typeof poops !== 'undefined' && poops.length > 0) {
          const nearPoop = poops.some(p => Math.hypot(p.x - b.x, p.y - b.y) < 38);
          if (nearPoop && Math.random() < 0.6) {
            b.speech = { text: pick(DISGUST_LINES), timer: SPEECH_DUR, dur: SPEECH_DUR };
            return;
          }
        }
        const near = npcs.find(o => o !== b && Math.hypot(o.x - b.x, o.y - b.y) < GREET_RANGE &&
          o.bathroomState !== 'in_bathroom' && o.bankerState !== 'at_counter' && o.honeyState !== 'offscreen');
        if (near) {
          buildRelationship(b, near, 2);
          const rel = getRelationship(b, near);
          const taxPanic = typeof taxTimer !== 'undefined' && taxTimer <= 300 && Math.random() < 0.7;
          let line;
          if (taxPanic) {
            line = pick(LINES.tax_warning);
          } else if (rel === 'friend') {
            line = pick(LINES.friend_greeting);
          } else if (rel === 'acquaintance') {
            line = pick(LINES.greeting);
          } else {
            line = pick(LINES.stranger_greeting);
          }
          b.speech         = { text: line, timer: SPEECH_DUR, dur: SPEECH_DUR };
          b._talkingTo     = near;
          near._listenTarget = b;
          near._listenTimer  = SPEECH_DUR + 0.4;
        }
      }
    }
  });
}
