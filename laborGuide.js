// laborGuide.js — Labor & delivery reference content for Bloom.
// Plain-language guidance assembled from ACOG, AWHONN, Lamaze International,
// and standard childbirth-education practice. Educational only; the user's
// provider always overrides anything here.

// Follow-along breathing patterns for the pacer. Each phase moves the ball to
// `level` (0 = bottom, 1 = top) over `secs` seconds.
const BREATHING_PATTERNS = [
  {
    id: 'slow',
    name: 'Slow breathing',
    tag: 'Start here',
    use: 'Early and active labor. Begin and end every contraction with one slow breath, and stay here as long as it keeps working.',
    phases: [
      { label: 'Breathe in', secs: 4, level: 1 },
      { label: 'Breathe out', secs: 6, level: 0 },
    ],
  },
  {
    id: 'light',
    name: 'Light breathing',
    tag: 'Peak of contraction',
    use: 'When slow breathing stops holding you at the peak. Shallow, quiet, in and out through the mouth, shoulders loose.',
    phases: [
      { label: 'In', secs: 2, level: 1 },
      { label: 'Out', secs: 2, level: 0 },
    ],
  },
  {
    id: 'pattern',
    name: 'Hee-hee-hoo',
    tag: 'Transition',
    use: 'Transition and the strongest contractions. Two short puffs and one long blow keep you from holding your breath or bearing down too early.',
    phases: [
      { label: 'In', secs: 1, level: 1 },
      { label: 'Hee', secs: 1, level: 0.55 },
      { label: 'In', secs: 1, level: 1 },
      { label: 'Hee', secs: 1, level: 0.55 },
      { label: 'In', secs: 1, level: 1 },
      { label: 'Hooo', secs: 2, level: 0 },
    ],
  },
  {
    id: 'candle',
    name: 'Candle breaths',
    tag: 'Don’t push yet',
    use: 'When you feel the urge to push but have been asked to wait, or to ease the head out slowly while crowning. Puff as if blowing out candles.',
    phases: [
      { label: 'In', secs: 1, level: 1 },
      { label: 'Puff', secs: 1, level: 0.66 },
      { label: 'Puff', secs: 1, level: 0.33 },
      { label: 'Puff', secs: 1, level: 0 },
    ],
  },
  {
    id: 'box',
    name: 'Box breathing',
    tag: 'Calm down',
    use: 'Between contractions, in triage, in the car, or whenever anxiety spikes. Equal counts in, hold, out, hold.',
    phases: [
      { label: 'Breathe in', secs: 4, level: 1 },
      { label: 'Hold', secs: 4, level: 1 },
      { label: 'Breathe out', secs: 4, level: 0 },
      { label: 'Hold', secs: 4, level: 0 },
    ],
  },
  {
    id: 'relax',
    name: '4-7-8 relaxation',
    tag: 'Rest',
    use: 'Resting or dozing between early-labor contractions, and for the first wired nights at home.',
    phases: [
      { label: 'Breathe in', secs: 4, level: 1 },
      { label: 'Hold', secs: 7, level: 1 },
      { label: 'Breathe out', secs: 8, level: 0 },
    ],
  },
];

const LABOR_GUIDE_GROUPS = [
  { id: 'now', title: 'In the moment' },
  { id: 'partner', title: 'Partner playbook' },
  { id: 'decide', title: 'Is it time?' },
  { id: 'stages', title: 'What happens' },
  { id: 'after', title: 'After the birth' },
  { id: 'prep', title: 'Get ready' },
];

// Topic shape: { id, group, title, quick, summary, tools?, sections: [{ h?, p?, ul?, ol?, tip?, warn? }] }
const LABOR_GUIDE = [
  // ---------------------------------------------------------------- IN THE MOMENT
  {
    id: 'coping-now',
    group: 'now',
    title: 'Coping right now',
    quick: true,
    summary: 'The short list to run through when a contraction is building and you cannot think.',
    tools: ['breathing', 'contraction'],
    sections: [
      {
        p: 'You only ever have to get through this one contraction. It will peak, it will end, and you will get a rest. Nothing else is required of you right now.',
      },
      {
        h: 'During the contraction',
        ol: [
          'One slow breath in through the nose, long sigh out through the mouth. That breath is the start signal.',
          'Loosen your jaw and shoulders. A loose jaw is a loose pelvis.',
          'Keep the breath going. Slow if you can; light and quick at the peak if slow stops working.',
          'Sound is fine. Keep it low: moans and “ohhh” sounds, not high screams. Low sound opens; high sound tightens.',
          'Pick one thing: a spot on the wall, your partner’s eyes, the ball under your hands, the pressure on your back.',
          'Let the peak pass. Count the exhales if that helps. Most contractions peak around the halfway point.',
          'Finish with one more slow cleansing breath and let your whole body go heavy.',
        ],
      },
      {
        h: 'Between contractions',
        ul: [
          'Drop your shoulders, unclench your hands, close your eyes. Use the gap. Even 60 seconds of real rest adds up over hours.',
          'Sip water or suck ice. Pee every hour; a full bladder slows labor and hurts more.',
          'Change position every 20 to 30 minutes if you can. Movement helps the baby rotate and descend.',
          'Say what you need in two words: “harder,” “lower,” “quiet,” “cold cloth.”',
        ],
      },
      {
        tip: 'If you ever feel yourself losing the rhythm or starting to panic, that is the moment for your partner to lock eyes with you and breathe with you, out loud, one breath at a time. Tell them this ahead of time.',
      },
    ],
  },
  {
    id: 'slow-breathing',
    group: 'now',
    title: 'Slow breathing',
    quick: true,
    summary: 'The foundation breath: in through the nose for about four counts, out through the mouth for six.',
    tools: ['breathing'],
    sections: [
      {
        p: 'Slow breathing is about half your normal rate, roughly six to eight breaths a minute. It keeps oxygen flowing to you and the baby, interrupts the fear-tension-pain cycle, and gives your mind a job. Most people can use it through all of early labor and well into active labor.',
      },
      {
        h: 'How',
        ol: [
          'As the contraction starts, take a deep, slow breath in through your nose and release it in a long sigh through your mouth. This is your cleansing breath.',
          'Keep breathing slowly: in for about four, out for about six. Let the out-breath be longer than the in-breath.',
          'Relax a different part of your body on each exhale: jaw, shoulders, hands, belly, thighs.',
          'When the contraction fades, take one more cleansing breath and let go completely.',
        ],
      },
      {
        h: 'Make it work harder',
        ul: [
          'Pair it with movement: sway, rock on the ball, or walk between contractions.',
          'Have your partner breathe audibly with you if you lose the rhythm.',
          'Add a word on the exhale: “open,” “down,” “soft.”',
          'Use the pacer in Bloom and just follow the ball. You do not have to count.',
        ],
      },
    ],
  },
  {
    id: 'light-breathing',
    group: 'now',
    title: 'Light and patterned breathing',
    quick: false,
    summary: 'What to do when slow breathing cannot hold you at the peak: lighter, quicker breaths or the hee-hee-hoo pattern.',
    tools: ['breathing'],
    sections: [
      {
        p: 'When contractions get strong enough that slow breathing falls apart at the peak, switch to light breathing for the peak only, then slow back down as it fades. Later, in transition, many people prefer a pattern with a rhythm to hold on to.',
      },
      {
        h: 'Light breathing',
        ul: [
          'Start the contraction with slow breathing.',
          'As it intensifies, let your breaths become lighter and quicker, about one per second, in and out through your mouth. Quiet, shallow, from the top of the chest.',
          'Keep your shoulders down. Tension creeps in fast with quick breathing.',
          'As the peak passes, slow the breaths back down. End with a cleansing breath.',
        ],
      },
      {
        h: 'Hee-hee-hoo (pant-pant-blow)',
        ul: [
          'Two short exhales (“hee, hee”) followed by one longer blow (“hooo”), then a quick breath in.',
          'Useful in transition when contractions come fast and you need something to grip. The long blow also stops you from holding your breath or pushing early.',
          'If you feel tingly or dizzy, you are breathing too fast. Cup your hands over your mouth and nose for a few breaths, then slow down.',
        ],
      },
      {
        h: 'Candle breaths',
        p: 'If you feel a strong urge to push before you are fully dilated, or you are asked to slow down while the head is crowning, puff out short breaths as if blowing out a row of candles. You cannot bear down while blowing.',
      },
    ],
  },
  {
    id: 'vocalizing',
    group: 'now',
    title: 'Sound and the loose jaw',
    quick: false,
    summary: 'Low moaning is one of the most effective coping tools there is. Here is how to use it on purpose.',
    sections: [
      {
        p: 'Making noise in labor is normal and useful. The trick is keeping the sound low and the jaw loose. Midwives have long observed that a relaxed mouth and jaw go with a relaxed pelvic floor, and that high, tight screaming tends to come with a tight, fighting body.',
      },
      {
        ul: [
          'On the exhale, let out a long, low “ohhhh” or “ahhhh,” as if you are trying to make a sound from your chest instead of your throat.',
          'If the sound climbs high, your partner can gently say “lower” and model a low tone. Match them.',
          'Horse lips (blowing air through loose, flapping lips) are silly and work remarkably well for jaw tension.',
          'Nobody in Labor & Delivery is judging the noise. They have heard it all and they know what it means.',
        ],
      },
      {
        tip: 'Pick a few words to repeat on the exhale that mean something to you: “open,” “down,” “yes,” “one at a time.” Repetition becomes a ritual, and rituals are what get people through.',
      },
    ],
  },
  {
    id: 'positions-early',
    group: 'now',
    title: 'Early labor: what to do with yourself',
    quick: false,
    summary: 'Rest if it is night, move if it is day, eat, drink, and stay home as long as you comfortably can.',
    tools: ['contraction'],
    sections: [
      {
        p: 'Early labor can last many hours, sometimes a day or more, especially with a first baby. The goal is to conserve energy and keep your body moving in ways that help the baby settle into a good position.',
      },
      {
        h: 'If it starts at night',
        ul: [
          'Try to sleep or at least rest between contractions. You will want that energy later.',
          'A warm bath (if your water has not broken) or shower can slow things enough to rest.',
          'Do not time every contraction all night. Check in for 30 minutes every couple of hours.',
        ],
      },
      {
        h: 'If it is daytime',
        ul: [
          'Walk, including stairs. Alternate 20 to 30 minutes of movement with rest.',
          'Sit and circle your hips on a birth ball. Lean forward over the ball on hands and knees.',
          'Eat light, easy foods: toast, broth, fruit, yogurt, pasta. Keep drinking.',
          'Distract yourself: a movie, a short walk outside, finishing the bag. Watching the clock makes it longer.',
          'Curb walking (one foot on the curb, one in the street) and side lunges on a step can help a baby rotate.',
        ],
      },
      {
        warn: 'Go in or call now, regardless of timing, if your water breaks and the fluid is green or brown, if you have bleeding like a period, if the baby is moving less, or if you are before 37 weeks. See “Go now” for the full list.',
      },
    ],
  },
  {
    id: 'positions-active',
    group: 'now',
    title: 'Positions for active labor',
    quick: true,
    summary: 'Upright, forward-leaning, and asymmetric positions use gravity and give the baby room to rotate.',
    sections: [
      {
        p: 'There is no single best position. Change every 20 to 30 minutes, follow your body, and avoid lying flat on your back for long stretches, which narrows the pelvis and can make contractions more painful and less effective.',
      },
      {
        h: 'Try',
        ul: [
          'Standing and leaning: arms around your partner’s neck, swaying (the slow dance). Partner can do counter-pressure at the same time.',
          'Leaning forward over the raised bed, a counter, or the birth ball while kneeling.',
          'Hands and knees: excellent for back labor and for helping a posterior baby turn. Rock your hips or do pelvic tilts during contractions.',
          'Sitting on the toilet, facing either way. It is where your body already knows how to let go, and it opens the pelvis.',
          'Side-lying with a peanut ball or pillows between your knees. The best resting position; it also keeps the pelvis open.',
          'Supported squat holding onto a bar, your partner, or the bed, between contractions as well as during.',
          'Lunging with one foot on a chair, switching sides.',
          'Sitting backward on a chair, arms folded over the back, partner behind you.',
        ],
      },
      {
        h: 'In the shower or tub',
        p: 'Warm water is so effective it is nicknamed the midwife’s epidural. Many hospitals have showers and some have tubs for labor. Aim the shower at your low back or belly. Ask your nurse when you arrive.',
      },
    ],
  },
  {
    id: 'back-labor',
    group: 'now',
    title: 'Back labor',
    quick: false,
    summary: 'Intense low-back pain, often from the baby facing forward. Counter-pressure, hands-and-knees, and hip squeezes are the tools.',
    sections: [
      {
        p: 'About a quarter of babies start labor facing your front (occiput posterior), which presses the hard back of the skull against your sacrum. The pain may not fully let up between contractions. Most of these babies rotate during labor, and these techniques help them do it.',
      },
      {
        ul: [
          'Hands and knees, or kneeling over the ball, takes the baby’s weight off your spine. Rock, sway, and do cat-cow during contractions.',
          'Firm counter-pressure on the sacrum during each contraction.',
          'Double hip squeeze between and during contractions.',
          'Side-lying with the top knee pulled up high over a peanut ball, switching sides every 30 minutes or so.',
          'Lunges and stairs sideways to open one side of the pelvis at a time.',
          'Heat on the low back between contractions, cold during, or the reverse. Try both.',
          'Rebozo or sheet “sifting”: partner gently jiggles your belly with a sheet while you are on hands and knees. Loosens the ligaments and often helps rotation.',
          'Ask about sterile water injections in the low back. Some units offer them; they relieve back pain for about an hour and have no effect on the baby.',
        ],
      },
    ],
  },
  {
    id: 'counter-pressure',
    group: 'now',
    title: 'Counter-pressure',
    quick: true,
    summary: 'Steady, firm pressure on the sacrum during a contraction. The single most requested partner skill.',
    sections: [
      {
        p: 'Counter-pressure works on the gate-control principle: a strong, steady pressure signal competes with the pain signal, and pressure on the sacrum also physically resists the baby’s head pushing outward. Done right, people describe it as the thing that made labor manageable.',
      },
      {
        h: 'How to do it (partner)',
        ol: [
          'Find the sacrum: the flat triangle of bone at the base of her spine, just above the tailbone, between the dimples.',
          'As the contraction starts, press with the heel of your hand, your fist, or a tennis ball. Lean your body weight in; this needs to be firm. Keep your wrist straight.',
          'Hold steady through the whole contraction. Do not rub or move around.',
          'Release slowly when it ends. Shake out your hands.',
          'Ask only yes-or-no questions: “Higher?” “Harder?” You will find the spot and the pressure she wants within a few contractions.',
        ],
      },
      {
        h: 'Positions that make it easier',
        ul: [
          'She leans forward over the bed, the ball, or a counter; you stand behind.',
          'She is on hands and knees; you kneel beside or behind her.',
          'She is side-lying; press on the sacrum while bracing her front hip with your other hand.',
        ],
      },
      {
        tip: 'Swap hands or switch to a fist or tennis balls in a sock. Hours of this is hard on the hands, and a tired partner presses less firmly without noticing.',
      },
    ],
  },
  {
    id: 'hip-squeeze',
    group: 'now',
    title: 'Double hip squeeze',
    quick: true,
    summary: 'Pressing both hips inward and up opens the back of the pelvis and relieves back pain fast.',
    sections: [
      {
        ol: [
          'She leans forward (over the ball, bed, or on hands and knees).',
          'Stand or kneel behind her. Place your palms on the outer, meaty part of each hip, roughly where the back pockets of jeans sit, fingers pointing toward her spine.',
          'During the contraction, press firmly inward and slightly up toward her belly button, as if trying to bring the hips together. Use your body weight, not just your arms.',
          'Hold steady until the contraction ends. Release slowly.',
        ],
      },
      {
        ul: [
          'If your hands tire, try with your forearms, or have two people take one hip each.',
          'Some people prefer the pressure a little higher, on the top of the pelvic bones. Adjust to what she says.',
          'Also helps between contractions to ease constant back ache.',
        ],
      },
    ],
  },
  {
    id: 'massage',
    group: 'now',
    title: 'Massage and touch',
    quick: false,
    summary: 'What to rub, when, and how hard. And when to stop touching entirely.',
    sections: [
      {
        p: 'Touch releases oxytocin and endorphins, both of which help labor and dull pain. But preferences swing wildly; something that felt wonderful an hour ago can be unbearable in transition. Ask, offer, and take “stop” instantly without hurt feelings.',
      },
      {
        h: 'Between contractions',
        ul: [
          'Shoulders and neck: slow, firm thumb circles. Most people carry labor tension here.',
          'Hands: press and hold the fleshy web between thumb and index finger; stroke each finger. Easy to do while she rests.',
          'Feet: firm thumb pressure along the arch, squeezing the heel. Warm socks after.',
          'Jaw and temples: light fingertip circles, reminding her to let the jaw hang.',
          'Long, slow strokes down the back and arms with firm pressure. Light, tickly touch tends to irritate.',
        ],
      },
      {
        h: 'During contractions',
        ul: [
          'Effleurage: light fingertip strokes over the belly in slow circles or from the center outward, timed with her breathing. Some love it, some cannot stand it.',
          'Firm, still pressure (a hand flat on the low back or thigh) is more often welcome than movement.',
          'Counter-pressure and hip squeezes (see those topics).',
        ],
      },
      {
        tip: 'Unscented lotion or oil prevents friction burn over hours of back rubbing. Skip strong scents; smell sensitivity in labor is real, and anything you bring near a newborn should be fragrance-free anyway.',
      },
    ],
  },
  {
    id: 'heat-cold-water',
    group: 'now',
    title: 'Heat, cold, and water',
    quick: false,
    summary: 'Warm compresses, cold cloths, showers, and tubs. Cheap, drug-free, and backed by evidence.',
    sections: [
      {
        ul: [
          'Warm: a rice sock or heating pad on the low back or lower belly between contractions. Warm compresses on the perineum during pushing reduce tearing; ask your nurse or midwife.',
          'Cold: a cold washcloth on the forehead, neck, or chest during contractions, especially in transition when many people feel hot and nauseated. A cold pack on the low back can also relieve back labor.',
          'Shower: aim the water at wherever it hurts most. Sit on a ball or stool in the shower if standing is tiring. Partner may want swim trunks.',
          'Tub: deep warm water at body temperature reduces pain scores and the need for medication. Many units allow laboring in a tub even if you plan to deliver out of it. Ask when you arrive.',
          'Alternate heat and cold; the contrast itself is distracting.',
        ],
      },
      {
        warn: 'Once your water has broken, follow your provider’s guidance about baths. Showers are generally fine.',
      },
    ],
  },
  {
    id: 'three-rs',
    group: 'now',
    title: 'Relaxation, rhythm, ritual',
    quick: false,
    summary: 'The simplest way to know labor is going well: she is coping if she has a rhythm. The partner’s job is to protect it.',
    sections: [
      {
        p: 'Childbirth educator Penny Simkin watched hundreds of births and noticed that people who were coping well, with or without medication, were doing three things: relaxing between contractions, finding a rhythm during them, and repeating that rhythm as a ritual. The ritual can be anything: rocking, moaning, tapping, counting, a phrase, a partner’s hands in a certain place.',
      },
      {
        h: 'For the laboring person',
        ul: [
          'You do not need to find the ritual in advance. It emerges. When something works, keep doing exactly that.',
          'If the ritual stops working, change one thing: position, breathing pattern, sound, or where the pressure is.',
        ],
      },
      {
        h: 'For the partner',
        ul: [
          'When she has a rhythm, your only job is to protect it: keep the room quiet and dim, intercept questions, keep doing your part of the ritual identically.',
          'Do not introduce new ideas during a contraction, ever.',
          'If she loses the rhythm and starts to panic, help her find a new one: eye contact, breathe out loud with her, rock with her, short firm instructions. This is called the take-charge routine, and you should talk about it in advance so it does not feel like bossing.',
        ],
      },
      {
        tip: 'Ask “how are you coping?” on a 1 to 10 scale rather than “how much does it hurt?” Coping is what matters, and it is the question that tells you whether to change something.',
      },
    ],
  },
  {
    id: 'environment',
    group: 'now',
    title: 'Setting the room',
    quick: false,
    summary: 'Dim, quiet, warm, private. Labor hormones flow best when the thinking brain is switched off.',
    sections: [
      {
        p: 'Oxytocin, the hormone that drives contractions, is shy. Bright lights, strangers, questions, and feeling watched all push the brain toward adrenaline, which slows labor and sharpens pain. You can set up a hospital room in five minutes.',
      },
      {
        ul: [
          'Lights down or off; a battery candle or string lights if you packed them.',
          'Your own music or a playlist you both agreed on, on a small speaker, low.',
          'Door closed, curtain drawn, sign on the door if the unit allows.',
          'Partner handles every knock, question, and form between contractions.',
          'Phone on do-not-disturb. Partner sends updates; she does not read messages.',
          'Her own pillow, a familiar smell, warm socks, something to hold.',
          'Ask for intermittent monitoring if you are low-risk and want to move, and for a wireless monitor if continuous monitoring is needed.',
        ],
      },
    ],
  },
  {
    id: 'pain-options',
    group: 'now',
    title: 'If you want to change the plan',
    quick: false,
    summary: 'A natural birth is a preference, not a test. Here is what the options are so any decision in the moment is informed.',
    sections: [
      {
        p: 'Planning an unmedicated birth and then choosing medication is not failure. It is making a decision with information you did not have before. Equally, you do not have to accept pain relief because it is offered. Knowing roughly what each option does lets you decide quickly if the moment comes.',
      },
      {
        h: 'Signs it may be time to reconsider',
        ul: [
          'You cannot rest at all between contractions and there is a long way to go.',
          'Exhaustion is making it impossible to cope, not just hard.',
          'Labor has stalled for hours and tension seems to be part of the picture.',
          'You are asking for it between contractions, not only at the peak. (Asking at the peak of transition is normal; partners should check again after it passes.)',
        ],
      },
      {
        h: 'Nitrous oxide',
        p: 'A 50/50 mix you breathe through a mask you hold yourself, starting as a contraction begins. Takes the edge off and reduces anxiety more than pain. Wears off within minutes, lets you keep moving, no effect on the baby. Can cause nausea or dizziness. Not available everywhere.',
      },
      {
        h: 'IV or injected medication',
        p: 'Opioids such as fentanyl, morphine, or nalbuphine. They blunt pain for an hour or two and can let you doze between contractions. They cause drowsiness and sometimes nausea, and they are usually avoided close to delivery because they can make the baby sleepy at birth.',
      },
      {
        h: 'Epidural',
        ul: [
          'A thin catheter placed in the lower back delivers continuous numbing medication. Placement takes about 15 to 20 minutes and relief follows within 10 to 20 more.',
          'You will need an IV, continuous monitoring, and usually a urinary catheter, and you will stay in bed (a peanut ball keeps the pelvis open).',
          'You will still feel pressure, especially when pushing, which is useful.',
          'Common side effects: a drop in blood pressure (treated with fluids and medication), itching, shivering, and a slightly longer pushing stage. Severe headache afterward is uncommon, around 1 in 100.',
          'There is no “too late” point set by dilation alone; the practical limit is whether there is time to place it before the baby arrives. There is also no benefit to waiting until a certain dilation.',
          'A combined spinal-epidural (walking epidural) gives faster relief with a bit more mobility; availability varies.',
        ],
      },
      {
        tip: 'Partners: if she says “I can’t do this” during transition, that is a classic sign the baby is close, not necessarily a request for medication. Say “you are doing it,” get through the contraction, and ask what she wants when it ends.',
      },
    ],
  },

  // ---------------------------------------------------------------- PARTNER
  {
    id: 'partner-script',
    group: 'partner',
    title: 'Partner: what to say and do',
    quick: true,
    summary: 'The job description for the support person, from early labor through pushing.',
    tools: ['contraction', 'breathing', 'gotime'],
    sections: [
      {
        h: 'Your jobs, in priority order',
        ol: [
          'Protect her rhythm. Quiet during contractions. No questions, no new ideas, no narrating.',
          'Be the pressure: counter-pressure, hip squeezes, a hand to crush.',
          'Breathe with her when she loses it. Out loud, slow, eye contact.',
          'Fluids every contraction or two: sips of water, ice chips, electrolyte drink through a straw.',
          'Bathroom every hour. A full bladder slows labor. Walk her there.',
          'Position change every 20 to 30 minutes unless she is resting well.',
          'Gatekeeper: handle staff, forms, phone, family. Relay the birth plan.',
          'Keep yourself fueled. Eat, drink, sit when you can. A fainting partner helps no one.',
        ],
      },
      {
        h: 'Say this',
        ul: [
          '“You’re doing it.” (Not “you can do it.” She is already doing it.)',
          '“One at a time.” “This one is almost done.” “Breathe out with me.”',
          '“I’m right here.” “Lower,” when her sound goes high.',
          'Nothing. Silence and steady hands are often the right answer.',
        ],
      },
      {
        h: 'Avoid',
        ul: [
          '“Relax” or “calm down.” It has never worked once in history.',
          'Asking questions during a contraction. Wait for the gap.',
          'Checking your phone while she is in a contraction. She will notice.',
          'Arguing with her about what she needs. If she says stop, stop.',
          'Announcing how long it has been or how far there is to go.',
          'Taking anything she says in transition personally.',
        ],
      },
      {
        h: 'Transition looks like this',
        p: 'Shaking, nausea or vomiting, hot then cold, irritability, panic, “I can’t do this,” “I want to go home,” suddenly asking for an epidural after hours of refusing one. It is the shortest stage and means the baby is nearly here. Your job is to stay calm and close and get her through one contraction at a time.',
      },
    ],
  },
  {
    id: 'partner-timeline',
    group: 'partner',
    title: 'Partner: the day, start to finish',
    quick: false,
    summary: 'What you will be asked to do, when, so nothing is a surprise.',
    tools: ['gotime'],
    sections: [
      {
        h: 'Early labor at home',
        ul: [
          'Time a few contractions every couple of hours; do not hover with the timer.',
          'Feed her light food, keep water nearby, run a bath if her water is intact.',
          'Finish the bag, install the car seat if not done, charge phones, fuel the car, sort pets and kids.',
          'Sleep if she is sleeping. You will need it.',
        ],
      },
      {
        h: 'The drive',
        ul: [
          'She rides in the back seat on hands and knees or side-lying if sitting is unbearable. Towel on the seat.',
          'Drive normally. Stop for a contraction if she asks.',
          'Know the entrance and parking plan from the go-time card. Call ahead if your provider wants that.',
        ],
      },
      {
        h: 'Triage',
        ul: [
          'Expect 20 to 60 minutes of monitoring and a cervical check before a decision to admit. Being sent home in early labor is common and not a failure.',
          'Hand over the birth plan; introduce yourself to the nurse; ask about eating and drinking, movement, the shower or tub, and intermittent monitoring.',
        ],
      },
      {
        h: 'Active labor and transition',
        p: 'Everything in “Partner: what to say and do.” Dim the room, start music, set up her comforts, then stay physically close.',
      },
      {
        h: 'Pushing and birth',
        ul: [
          'Support a leg, hold her hand, or stay at her head, whichever she wants. You can look or not look.',
          'Mirror her breathing. Tell her when you see hair if she wants to know.',
          'Decide beforehand whether you want to cut the cord and announce the sex (if unknown).',
          'After the baby is out, your job is skin-to-skin logistics: unbutton your shirt, have the hat ready, take photos only after the first minutes.',
        ],
      },
      {
        h: 'The first hours',
        ul: [
          'Help with the first latch (hold the phone light, adjust pillows, flag the nurse or lactation consultant).',
          'Send the go-time update messages. Field calls.',
          'Eat. Then watch the baby while she showers and eats.',
        ],
      },
    ],
  },
  {
    id: 'take-charge',
    group: 'partner',
    title: 'Partner: when she panics',
    quick: true,
    summary: 'The take-charge routine for the moment she loses her rhythm, says she cannot, or starts to spiral.',
    tools: ['breathing'],
    sections: [
      {
        p: 'At some point, usually in transition, she may lose her coping rhythm entirely: crying, thrashing, holding her breath, saying she cannot do this. This is normal and it is your cue, not your crisis. Agree in advance that you will do the following so it does not feel like you are taking over.',
      },
      {
        ol: [
          'Get close. Face to face, hands on her shoulders or holding her face gently. Stay there.',
          'Get her eyes. “Look at me.” Keep eye contact through the contraction.',
          'Breathe out loud with her, slowly and exaggeratedly. “In... and out. Again. Stay with me. That’s it.”',
          'Move with her: rock, sway, nod the rhythm.',
          'Short, calm, confident commands. Not questions. “Breathe out. Loosen your jaw. Lower. Good.”',
          'When it ends: “That one is done. You did that. Rest now.” Then tell her the plan for the next one: “Next one, we do exactly that again.”',
        ],
      },
      {
        ul: [
          'If she has been asking for medication repeatedly between contractions, after this routine, take it seriously and get the nurse. Agree on a code word beforehand so you both know when she means it.',
          'If a nurse or midwife steps in to coach her, step back and let them; add your hands, not your voice.',
        ],
      },
    ],
  },

  // ---------------------------------------------------------------- IS IT TIME?
  {
    id: 'five-one-one',
    group: 'decide',
    title: 'When to go: the 5-1-1 rule',
    quick: true,
    summary: 'Contractions 5 minutes apart, lasting 1 minute, for 1 hour. Adjust for your provider, your distance, and whether this is your first baby.',
    tools: ['contraction', 'gotime'],
    sections: [
      {
        p: 'For a healthy, full-term pregnancy with intact waters and no other warning signs, most providers suggest heading in when contractions have settled into a pattern: about five minutes apart from the start of one to the start of the next, lasting about a minute, and sustained for about an hour. Some say 4-1-1 or 3-1-1 for first babies if you live close; some say 5-1-1 even for a second baby if you live far. Follow yours, and enter their rule in the contraction timer.',
      },
      {
        h: 'Signs that matter more than the stopwatch',
        ul: [
          'You cannot walk or talk through contractions; you have to stop and focus on every one.',
          'They are getting stronger, longer, and closer, not just regular.',
          'They keep coming no matter what you do: a bath, a walk, lying down, a big glass of water.',
          'You feel rectal pressure or an urge to push. Go now.',
          'Your gut says go. That instinct is worth listening to.',
        ],
      },
      {
        h: 'Reasons to go sooner than the rule',
        ul: [
          'This is not your first baby. Second and later labors are often much faster.',
          'You live more than 30 to 45 minutes away, or weather or traffic is bad.',
          'You are GBS positive and your water has broken (you need antibiotics started).',
          'Your provider told you to come early for any reason: previous fast labor, planned antibiotics, blood pressure, a breech or other known issue.',
        ],
      },
      {
        tip: 'Call Labor & Delivery before you leave if your provider wants a heads-up. The number belongs on your go-time card. Say your name, your provider, how far along you are, and what is happening.',
      },
    ],
  },
  {
    id: 'go-now',
    group: 'decide',
    title: 'Go now, do not wait for a pattern',
    quick: true,
    summary: 'The situations where you call or go in immediately regardless of contraction timing.',
    tools: ['gotime'],
    sections: [
      {
        h: 'Call Labor & Delivery or go in right away',
        ul: [
          'Your water breaks and the fluid is green, brown, or dark (meconium), or has a foul smell.',
          'Your water breaks at all and you are GBS positive, or your provider told you to come in for ruptured membranes.',
          'Bleeding like a period, bright red or with clots. Pink-tinged mucus (bloody show) is normal; flowing blood is not.',
          'The baby is moving noticeably less, or you cannot get 10 movements in two hours after eating, drinking, and lying on your side.',
          'Regular contractions, cramping, pelvic pressure, or watery discharge before 37 weeks.',
          'A severe headache that does not ease, vision changes, pain under your right ribs, or sudden swelling of your face or hands (preeclampsia signs).',
          'Constant severe abdominal pain or a belly that stays hard and does not relax between contractions.',
          'Fever of 100.4 °F (38 °C) or higher.',
          'An urge to push or rectal pressure, at any point.',
        ],
      },
      {
        h: 'Call 911',
        ul: [
          'You feel or see the umbilical cord in the vagina. Get into knee-chest position (kneeling with chest and shoulders down, hips up) and stay there.',
          'The baby is coming and you cannot make it to the hospital. The dispatcher will talk you through it; babies that come this fast usually come easily.',
          'Heavy bleeding (soaking through a pad in minutes), fainting, a seizure, or chest pain or trouble breathing.',
        ],
      },
      {
        warn: 'When you call, say clearly: “I am [weeks] pregnant” or “I gave birth [days] ago” and the specific symptom. Pregnancy and postpartum change how emergencies are handled.',
      },
    ],
  },
  {
    id: 'coat',
    group: 'decide',
    title: 'Water breaking: COAT',
    quick: true,
    summary: 'Color, Odor, Amount, Time. Note all four, then call. Only about 1 in 10 labors starts this way.',
    tools: ['gotime'],
    sections: [
      {
        p: 'Membranes rupture as a gush or a slow trickle you cannot stop. Put on a pad and note the following; your provider will ask for exactly these.',
      },
      {
        ul: [
          'Color: clear or pale straw is normal. Pink-tinged is usually fine. Green, brown, or dark means meconium (the baby’s first stool) and you should go in now. Red means call now.',
          'Odor: normal fluid is odorless or faintly sweet. A foul smell can mean infection; go in.',
          'Amount: gush or trickle, and whether it keeps coming. If unsure whether it is urine or fluid: it is usually clear, it does not smell like urine, you cannot stop it by squeezing, and if you lie down for 20 to 30 minutes and then stand up, amniotic fluid tends to gush again as it pools.',
          'Time: write down when it happened. Infection risk rises with hours since rupture, and your provider will use the time to plan.',
        ],
      },
      {
        h: 'Then',
        ul: [
          'Call your provider or Labor & Delivery. Most want you in within a couple of hours even without contractions, and right away if you are GBS positive, if the fluid is not clear, or if the baby is not head-down.',
          'Nothing in the vagina from now on: no tampons, no intercourse, no checking yourself.',
          'Showers are fine. Ask about baths.',
          'If contractions have not started on their own, most providers will discuss induction within 12 to 24 hours to reduce infection risk. Many labors start within that window anyway.',
        ],
      },
      {
        warn: 'If you feel something in the vagina or see the cord after your water breaks, get into knee-chest position and call 911.',
      },
    ],
  },
  {
    id: 'true-false',
    group: 'decide',
    title: 'Real labor or practice?',
    quick: false,
    summary: 'How to tell Braxton Hicks and prodromal labor from the real thing, and the three tests that settle it.',
    tools: ['contraction'],
    sections: [
      {
        h: 'Likely practice (Braxton Hicks or prodromal labor)',
        ul: [
          'Irregular; they do not get steadily closer together or longer.',
          'Felt mainly in the front, like a tightening.',
          'Ease up when you change activity, walk, lie down, hydrate, or take a warm bath.',
          'Intensity stays about the same, or fades.',
          'Can go on for hours, even nights in a row, and then stop. Exhausting, and not pointless: they are doing cervical work.',
        ],
      },
      {
        h: 'Likely the real thing',
        ul: [
          'Regular and progressively closer, longer, and stronger.',
          'Often start in the back and wrap around to the front, or feel like strong menstrual cramps that build.',
          'Continue and intensify no matter what you do.',
          'Come with other signs: bloody show, loose stools, pressure, water breaking.',
        ],
      },
      {
        h: 'The three tests',
        ol: [
          'Drink two big glasses of water. Dehydration triggers practice contractions.',
          'Change what you are doing: if you were walking, lie down on your left side; if you were resting, walk.',
          'Take a warm bath or shower. Practice contractions usually fade; real labor usually continues or picks up.',
        ],
      },
      {
        tip: 'The mucus plug can come out days or weeks before labor; losing it is not a reason to go in. Bloody show (mucus streaked pink or brown) usually means things are closer, often within a day or two.',
      },
    ],
  },
  {
    id: 'triage',
    group: 'decide',
    title: 'What happens in triage',
    quick: false,
    summary: 'The hour between walking in and being admitted, including the possibility of being sent home.',
    tools: ['gotime'],
    sections: [
      {
        ul: [
          'Where you go matters. Past about 20 weeks, most hospitals route you straight to Labor & Delivery triage, not the main emergency room. Confirm the entrance with your provider, especially after hours, and write it on the go-time card.',
          'A nurse will take vitals, ask when contractions started and how far apart they are, whether your water has broken, and when you last felt the baby move.',
          'You will be put on the monitor for 20 to 40 minutes: one belt for contractions, one for the baby’s heartbeat.',
          'A cervical check measures dilation (0 to 10 cm), effacement (thinning, 0 to 100%), and station (how low the baby is).',
          'Admission is typical from about 4 to 6 cm with a regular pattern, or earlier if your water has broken, you are GBS positive, or there is any concern.',
          'If you are early, you may be asked to walk for an hour or two and be rechecked, or sent home with instructions. This is common, it is not a judgment, and it is often the better place to spend early labor.',
          'Bring: ID, insurance card, birth plan copies, phone and charger, snacks for the partner. The bag can stay in the car until you are admitted.',
        ],
      },
    ],
  },
  {
    id: 'preterm',
    group: 'decide',
    title: 'Preterm labor signs (before 37 weeks)',
    quick: false,
    summary: 'Subtle symptoms count. When in doubt, lie down, hydrate, count for an hour, and call.',
    tools: ['contraction', 'gotime'],
    sections: [
      {
        h: 'Symptoms to take seriously',
        ul: [
          'Contractions or tightening more than four to six times in an hour, even if they do not hurt.',
          'Menstrual-like cramps, steady or coming and going.',
          'A low, dull backache that is new or different.',
          'Pelvic pressure, as if the baby is pushing down.',
          'A change in discharge: watery, mucousy, or blood-tinged, or a sudden increase.',
          'Diarrhea or intestinal cramping.',
          'Leaking fluid or a gush.',
        ],
      },
      {
        h: 'What to do',
        ol: [
          'Empty your bladder.',
          'Drink two to three glasses of water.',
          'Lie down on your left side and count contractions for one hour.',
          'If you have more than four to six in that hour, if symptoms continue, or if there is any fluid or bleeding, call your provider or Labor & Delivery now. Do not wait for morning.',
        ],
      },
      {
        p: 'If preterm labor is confirmed, treatment may include steroid injections to mature the baby’s lungs, magnesium to protect the brain before 32 weeks, medication to slow contractions briefly, and antibiotics for GBS. Even a day or two of delay can matter, which is why calling early counts.',
      },
    ],
  },
  {
    id: 'preeclampsia',
    group: 'decide',
    title: 'Preeclampsia signs, before and after birth',
    quick: true,
    summary: 'High blood pressure plus warning symptoms, any time after 20 weeks and up to six weeks postpartum. Call; it does not wait until morning.',
    tools: ['gotime'],
    sections: [
      {
        p: 'Preeclampsia is a blood pressure disorder of pregnancy that can escalate quickly. It is usually caught at prenatal visits, but it can appear between visits, during labor, and, something many people are never told, after the baby is born. Postpartum preeclampsia most often shows up in the first week after delivery but can occur up to six weeks out.',
      },
      {
        h: 'Call your provider or go in now for',
        ul: [
          'A severe headache that does not go away with rest or acetaminophen, or a headache unlike your usual.',
          'Vision changes: spots, flashing lights, blurring, sensitivity to light, or temporary loss of vision.',
          'Pain under the right ribs or in the upper belly, or pain in the right shoulder.',
          'Sudden swelling of the face, hands, or around the eyes, or sudden weight gain of several pounds in a few days.',
          'Nausea or vomiting in the second half of pregnancy or after birth.',
          'Shortness of breath, chest pain, or feeling like you cannot lie flat.',
          'A blood pressure reading of 140/90 or higher, if you have a home cuff. 160/110 or higher is an emergency.',
          'A sense that something is wrong. Many people describe it that way afterward.',
        ],
      },
      {
        h: 'After the birth',
        ul: [
          'Watch for the same signs for six weeks. Severe headache and swelling are the most common first symptoms.',
          'If you had high blood pressure at any point in pregnancy, ask about a home blood pressure cuff and a blood pressure check within the first week.',
          'When you call, start with “I gave birth [X] days ago.” Postpartum preeclampsia is treated urgently and the staff need to know.',
        ],
      },
      {
        warn: 'A seizure, or stroke-like symptoms (face drooping, one-sided weakness, confusion), is a 911 call.',
      },
    ],
  },
  {
    id: 'movement',
    group: 'decide',
    title: 'Baby’s movements in late pregnancy',
    quick: false,
    summary: 'Babies do not slow down before labor. A real decrease is always worth a call, day or night.',
    tools: ['kick'],
    sections: [
      {
        ul: [
          'From 28 weeks, get to know your baby’s pattern. Many are most active after meals and in the evening.',
          'Count at roughly the same time each day, when the baby is usually active. Lie on your side or sit comfortably and count kicks, rolls, and jabs (not hiccups). Most people feel 10 movements well within 30 minutes to an hour.',
          'Movements change character near the end as space gets tight, from kicks to rolls and squirms, but they should not become less frequent.',
        ],
      },
      {
        h: 'If movements seem reduced',
        ol: [
          'Eat something and drink a glass of cold water.',
          'Lie on your left side in a quiet room and focus for up to two hours.',
          'If you do not feel 10 movements in two hours, or the pattern is clearly different from normal, call Labor & Delivery immediately. Do not wait until morning and do not rely on a home Doppler. They will want to monitor you, and they would always rather see you.',
        ],
      },
    ],
  },

  // ---------------------------------------------------------------- WHAT HAPPENS
  {
    id: 'stage-early',
    group: 'stages',
    title: 'Early labor (0 to 6 cm)',
    quick: false,
    summary: 'The long, uneven opening act. Hours to a day or more, mostly at home.',
    tools: ['contraction'],
    sections: [
      {
        ul: [
          'Contractions: irregular at first, 5 to 30 minutes apart, 30 to 45 seconds long, gradually organizing. You can usually talk through them.',
          'Cervix: thinning (effacing) and opening to about 6 cm. For a first baby, this can take 12 to 20 hours, sometimes longer, and it may start and stop.',
          'Other signs: bloody show, loose stools, nausea, backache, a burst of nesting energy, water breaking (sometimes).',
          'What helps: rest, eat, drink, bathe, walk, distract. Save your energy. Time contractions occasionally, not constantly.',
          'How it ends: contractions become regular, closer, and demanding. You stop talking through them. That transition into active labor is usually when you head in.',
        ],
      },
      {
        tip: 'Early labor that drags on with irregular contractions for a day or more is called prodromal labor. It is tiring but not dangerous. Sleep when you can, eat, and consider a warm bath or a glass of wine’s worth of rest if your provider is fine with it. Call if you are exhausted; there are options for rest.',
      },
    ],
  },
  {
    id: 'stage-active',
    group: 'stages',
    title: 'Active labor (6 to 8 cm)',
    quick: false,
    summary: 'Contractions every 3 to 5 minutes, a minute long, and all-consuming. Usually 4 to 8 hours for a first baby.',
    tools: ['breathing'],
    sections: [
      {
        ul: [
          'Contractions: 3 to 5 minutes apart, 45 to 70 seconds, strong and regular. Each one demands your full attention.',
          'Cervix: dilating more predictably now, typically about a centimeter every hour or two for a first baby, faster for later babies. Progress is not linear; plateaus are normal.',
          'You may feel: serious, inward, quiet between contractions, less interested in talking. Shaking legs, hot and cold flashes, back pressure.',
          'What helps: everything in “In the moment.” Position changes, water, counter-pressure, breathing, low sound, dim room, partner close.',
          'Hospital routine: periodic monitoring of the baby’s heartbeat, vitals, and cervical checks every few hours (you can ask for fewer). An IV or saline lock is common; ask about a lock only if you want to keep moving.',
        ],
      },
      {
        p: 'If labor stalls in this stage for several hours, your team may suggest breaking the water, position changes, a peanut ball, or Pitocin to strengthen contractions. Ask what they are seeing, what the options are, and what happens if you wait an hour.',
      },
    ],
  },
  {
    id: 'stage-transition',
    group: 'stages',
    title: 'Transition (8 to 10 cm)',
    quick: true,
    summary: 'The hardest and shortest part. Contractions nearly back to back, and a strong feeling that you cannot go on. You are almost there.',
    tools: ['breathing'],
    sections: [
      {
        ul: [
          'Contractions: 2 to 3 minutes apart, 60 to 90 seconds, sometimes double-peaked with very little rest.',
          'Lasts: anywhere from 15 minutes to about 2 hours, usually under an hour.',
          'You may feel: shaking, nausea or vomiting, hot and cold, pressure in your rectum, irritability, panic, crying, a certainty that you cannot do this, a wish to leave. Every one of these is normal and is a sign of progress.',
          'What helps: one contraction at a time, light or patterned breathing, cold cloth, firm pressure, partner close and quiet, eye contact, the take-charge routine if you lose the rhythm. Candle breaths if you feel pushy before you are checked.',
          'Tell the staff when you feel rectal pressure or an urge to push. They will check whether you are complete.',
        ],
      },
      {
        tip: 'Partners: “I can’t do this” in transition is a sign of progress, not a decision. Respond with “you are doing it; this one is almost over,” and reassess when it passes.',
      },
    ],
  },
  {
    id: 'stage-pushing',
    group: 'stages',
    title: 'Pushing and birth',
    quick: true,
    summary: 'From fully dilated to baby. Twenty minutes to three hours for a first baby. Pushing is work, but many people find it a relief after transition.',
    tools: ['breathing'],
    sections: [
      {
        h: 'How it feels',
        ul: [
          'Contractions space out slightly, often to 3 to 5 minutes, and change character: an overwhelming urge to bear down, like needing to have a bowel movement. Some people get a rest period (“rest and be thankful”) before the urge arrives; use it.',
          'Pressure, stretching, burning as the head crowns (“ring of fire”), which lasts a minute or two and then eases as the head emerges.',
          'You may feel the baby move back up slightly between pushes. That is normal; progress is two steps forward, one back.',
        ],
      },
      {
        h: 'How to push',
        ul: [
          'Follow your body’s urge. Spontaneous pushing (several shorter pushes per contraction, with breath) is gentler on the perineum than prolonged breath-holding, and equally effective. If you have an epidural and feel less, staff may coach you when to push.',
          'Push into your bottom, as though having a bowel movement. Everyone worries about pooping; it happens, nobody cares, and it means you are pushing in the right place.',
          'Curl around the baby: chin down, round your back, relax your pelvic floor and jaw. Grunting and low sounds help; screaming high sends the effort upward.',
          'Rest fully between contractions. Sip water. Let your partner wipe your face.',
        ],
      },
      {
        h: 'Positions',
        ul: [
          'Side-lying with the top leg supported: gentle on the perineum, good for resting between pushes, works with an epidural.',
          'Hands and knees: good for back labor and big babies; takes pressure off the tailbone.',
          'Supported squat or squat bar: opens the pelvis up to 30% more; tiring, so use it when the baby is close.',
          'Semi-sitting, upright in the bed: the most common default; try to stay upright rather than flat.',
          'Flat on your back with legs pulled back is the least helpful for most people; ask to adjust if you end up there.',
        ],
      },
      {
        h: 'Protecting the perineum',
        ul: [
          'Warm compresses held against the perineum during crowning reduce serious tears. Ask for them.',
          'When the head crowns, your provider may ask you to stop pushing and breathe (candle breaths) so the head emerges slowly. This is the moment that matters most for tearing.',
          'Episiotomy (a cut) is no longer routine; it is reserved for specific situations. You can say in your birth plan that you prefer to avoid one.',
        ],
      },
      {
        h: 'The moment of birth',
        p: 'Once the head is out, the provider checks for the cord, the shoulders rotate and deliver with the next push, and the rest follows quickly. Most babies cry within seconds and are placed straight onto your chest. Blue-purple hands and feet are normal for the first minutes and even days; the body pinks up fast. White, waxy vernix and some blood are expected. Ask for the baby to be dried on your chest rather than taken to the warmer if everything is well.',
      },
    ],
  },
  {
    id: 'stage-placenta',
    group: 'stages',
    title: 'Placenta, cord, and fundal massage',
    quick: true,
    summary: 'The third stage: 5 to 30 minutes after birth. Delayed cord clamping, the placenta, and the uterine massage nobody warns you about.',
    sections: [
      {
        h: 'Cord clamping',
        p: 'ACOG recommends waiting at least 30 to 60 seconds before clamping for healthy term and preterm babies; many providers wait longer, until the cord stops pulsing. The baby receives extra blood volume and iron. Put your preference in the birth plan and remind the team in the moment. Partners can cut the cord after it is clamped if they want to; it is rubbery and takes a firm snip.',
      },
      {
        h: 'Delivering the placenta',
        ul: [
          'Mild contractions return a few minutes after birth. You may be asked to give a small push; the provider applies gentle traction on the cord and pressure on your belly.',
          'Most hospitals give a dose of Pitocin (oxytocin) at this point, by IV or injection, to help the uterus clamp down and reduce bleeding. This is routine and evidence-based.',
          'The placenta comes out in one piece; it is soft and about the size of a dinner plate. You can see it if you like.',
          'Skin-to-skin and early nursing release your own oxytocin and help with this stage.',
        ],
      },
      {
        h: 'Fundal massage',
        p: 'After the placenta, the nurse presses firmly on your lower belly to make sure the uterus (fundus) is firm and contracted, which prevents hemorrhage. It is uncomfortable, sometimes very, and it is one of the most important things that happen in those first hours. Expect checks every 15 minutes at first, then every few hours. Nurses will show you how to feel for a firm, grapefruit-sized lump at or below your belly button and how to rub it firm yourself if it feels soft.',
      },
      {
        h: 'Afterpains',
        p: 'Cramping as the uterus shrinks over the next days, strongest during breastfeeding (oxytocin again) and noticeably stronger with each subsequent baby. Keeping your bladder empty helps. Ask the nurses what is available for comfort.',
      },
    ],
  },
  {
    id: 'first-hour',
    group: 'stages',
    title: 'The first hour: skin-to-skin, APGAR, first latch',
    quick: true,
    summary: 'What happens to the baby in the first 60 minutes, and what can wait.',
    sections: [
      {
        h: 'Skin-to-skin',
        p: 'A healthy baby belongs on your bare chest, dried, with a warm blanket over both of you and a hat on, for at least the first hour. It stabilizes the baby’s temperature, breathing, blood sugar, and heart rate, calms both of you, and is the strongest setup for a first latch. Weighing, measuring, and footprints can wait. If a cesarean or a complication delays it, the partner can do skin-to-skin (hence the button-down shirt), and you can start as soon as you are able.',
      },
      {
        h: 'APGAR score',
        p: 'A quick check at one and five minutes of five things: color, heart rate, reflexes, muscle tone, and breathing, each scored 0 to 2. A total of 7 to 10 is reassuring. Most healthy babies score 8 or 9, losing a point for bluish hands and feet. It is done on your chest; a lower score at one minute simply means a little help and a recheck, and it does not predict anything about your child.',
      },
      {
        h: 'First feed',
        p: 'Most babies are alert and rooting within the first 20 to 60 minutes, then sleep deeply for several hours. Starting breastfeeding within the first hour is one of the strongest predictors of breastfeeding going well; it stimulates milk production early and the baby gets colostrum, a small, concentrated first milk. Ask for help with positioning from the nurse or lactation consultant. If the baby only licks and nuzzles, that still counts.',
      },
      {
        h: 'Newborn procedures',
        ul: [
          'Vitamin K injection: prevents a rare but serious bleeding disorder. Recommended for all newborns by the AAP. Can be done on your chest after the first feed.',
          'Erythromycin eye ointment: prevents eye infections from bacteria in the birth canal. Required by law in many states; discuss any preferences in advance.',
          'Hepatitis B vaccine: first dose recommended within 24 hours of birth.',
          'ID bands for baby and both parents, footprints, and a security tag. These happen in the room.',
          'Weight, length, and head circumference, often after the first hour.',
          'A bath, if offered, can be delayed at least 6 to 24 hours; vernix is protective and the delay helps temperature and feeding. Many hospitals now default to this.',
        ],
      },
      {
        h: 'Normal and surprising',
        ul: [
          'A cone-shaped head from molding; it rounds out in days.',
          'Puffy eyes and face, swollen genitals in both sexes (hormones), a little vaginal discharge or even spotting in girls.',
          'Fine hair (lanugo) on shoulders and back, peeling skin, tiny white bumps (milia).',
          'Crossed or wandering eyes, sneezing, hiccups, startling, irregular breathing with pauses up to about 10 seconds.',
          'Long fingernails, sometimes already scratching; mittens or a file in the first days.',
        ],
      },
    ],
  },
  {
    id: 'tears-repair',
    group: 'stages',
    title: 'Tears and stitches',
    quick: false,
    summary: 'Most first births involve some tearing. What the degrees mean, what repair is like, and how it heals.',
    sections: [
      {
        ul: [
          'First degree: skin only. May not need stitches. Heals in a week or two.',
          'Second degree: skin and perineal muscle. The most common; stitched with dissolving sutures under local anesthetic (or the epidural). Sore for two to three weeks; healed by six.',
          'Third and fourth degree: extend into or through the anal sphincter. Less common (a few percent of births). Repaired carefully, sometimes in the operating room, with follow-up for healing and pelvic floor.',
          'Labial or periurethral grazes: shallow tears near the front that sting when you pee. A peri bottle of warm water while peeing fixes the sting.',
        ],
      },
      {
        h: 'Repair',
        p: 'Done right after the placenta while the baby is on your chest. You will feel tugging and should not feel sharp pain; say so if you do and they will add numbing. It usually takes 10 to 30 minutes.',
      },
      {
        h: 'Reducing the risk',
        ul: ['Warm compresses during crowning.', 'Slow, breath-guided delivery of the head.', 'Side-lying or hands-and-knees pushing positions.', 'Perineal massage from 34 weeks (modest benefit for first births).', 'Avoiding directed, prolonged breath-holding pushes when possible.'],
      },
    ],
  },
  {
    id: 'cesarean',
    group: 'stages',
    title: 'If it becomes a cesarean',
    quick: false,
    summary: 'About one in three US births. Knowing the sequence makes an unplanned one far less frightening.',
    sections: [
      {
        h: 'Common reasons during labor',
        ul: ['Labor that stops progressing despite time and Pitocin.', 'Concerning changes in the baby’s heart rate.', 'A baby that will not fit or is in a poor position.', 'Bleeding, cord problems, or maternal illness.'],
      },
      {
        h: 'What happens',
        ol: [
          'Unless it is a true emergency, there is time: consent, questions, and prep. Ask “is this urgent or can we talk for a minute?”',
          'Anesthesia is usually an epidural top-up or a spinal; you stay awake. General anesthesia is reserved for true emergencies.',
          'A catheter, a shave, antiseptic prep, and a drape across your chest. Your partner comes in once you are ready, in scrubs, sitting at your head.',
          'You feel pressure, tugging, and pulling, not pain. The baby is usually out within 5 to 15 minutes; closing takes 30 to 45 minutes.',
          'Ask for a clear drape or for the drape to be lowered at the moment of birth, delayed cord clamping if possible, and skin-to-skin in the operating room, which many hospitals now do. If you cannot, your partner can.',
          'Recovery room for one to two hours, where breastfeeding can begin.',
        ],
      },
      {
        h: 'Recovery differences',
        ul: [
          'Hospital stay of two to four days. Walking within 12 to 24 hours speeds recovery.',
          'Incision care: keep it clean and dry, support it with a pillow when coughing or laughing, watch for redness, oozing, or opening.',
          'No lifting heavier than the baby for about two weeks, no driving until you can brake hard without pain (often two weeks).',
          'Gas pain in the shoulders and belly is common in the first days; walking helps.',
          'Grief or disappointment about the change of plan is normal and worth talking about, including with your provider at the postpartum visit.',
        ],
      },
    ],
  },
  {
    id: 'induction',
    group: 'stages',
    title: 'Induction and going past your due date',
    quick: false,
    summary: 'Why providers offer induction at 41 weeks, what the risks of going long are, and what each method involves.',
    sections: [
      {
        h: 'Why 41 weeks comes up',
        p: 'A due date is the middle of a range, and most first babies arrive after it. But past 41 weeks, the placenta gradually becomes less efficient, amniotic fluid decreases, and the baby keeps growing. The risk of stillbirth, while still low, rises noticeably from 41 to 42 weeks and beyond, along with higher rates of meconium in the fluid, low fluid, large babies, and cesarean. For these reasons ACOG recommends offering induction at 41 weeks and advises delivery by 42. Between 41 and 42 weeks, twice-weekly monitoring (non-stress tests and fluid checks) is standard if you wait.',
      },
      {
        h: 'Methods, roughly in the order they are used',
        ul: [
          'Membrane sweep: at a regular visit, the provider runs a finger around the inside of the cervix to separate the membranes. Crampy, can cause spotting, and modestly increases the chance of labor within 48 hours.',
          'Cervical ripening: a medication (misoprostol tablet or dinoprostone insert) or a balloon catheter placed through the cervix to soften and open it. Often overnight.',
          'Breaking the water (amniotomy): with a small hook, painless, once the cervix is open enough.',
          'Pitocin: synthetic oxytocin by IV, increased gradually until contractions are regular. Contractions can feel more intense and closer together than spontaneous ones; continuous monitoring is required.',
        ],
      },
      {
        h: 'What to know',
        ul: [
          'Induction with an unripe cervix can take one to three days. Bring entertainment and rest early.',
          'Research (the ARRIVE trial) found that elective induction at 39 weeks did not increase cesarean rates in first-time, low-risk mothers, and slightly reduced them. This is why some providers offer 39-week induction.',
          'You can ask about pausing Pitocin once labor is established, about intermittent monitoring if your unit has wireless telemetry, and about eating.',
          'All of the coping techniques in this guide apply to an induced labor.',
        ],
      },
    ],
  },

  // ---------------------------------------------------------------- AFTER
  {
    id: 'hospital-stay',
    group: 'after',
    title: 'The hospital stay',
    quick: false,
    summary: 'One to two nights after a vaginal birth, two to four after a cesarean. What the staff will do and what to ask for.',
    sections: [
      {
        h: 'For you',
        ul: [
          'Fundus and bleeding checks, vitals, and pain checks every few hours at first, including overnight.',
          'You will be helped up to the bathroom the first time; stand up slowly, people faint. The nurse will want to see you pee within about six hours.',
          'Peri bottle, ice packs, witch hazel pads, and mesh underwear are provided. Ask for extras to take home.',
          'Ask for a lactation consultant on day one and again before discharge, even if things seem fine.',
          'Eat and sleep whenever you can. Send visitors away if you need to; nurses will happily be the bad guy.',
        ],
      },
      {
        h: 'For the baby',
        ul: [
          'Vitals and weight checks; a weight loss of up to 7 to 10 percent in the first days is expected.',
          'Hearing screen; a pulse-oximetry heart screen after 24 hours; a heel-prick blood test for dozens of metabolic conditions at 24 to 48 hours; a bilirubin (jaundice) check.',
          'Pediatrician rounds each morning. Have your questions written down.',
          'Circumcision, if chosen, usually on day one or two, or arranged outpatient.',
          'The first diapers (black, tarry meconium) and the first feeds are documented; you will be asked to keep a log. Bloom’s Day view is that log.',
        ],
      },
      {
        h: 'Paperwork and leaving',
        ul: [
          'Birth certificate worksheet and Social Security number application are done in the hospital. Decide on the name and spelling before you arrive.',
          'Add the baby to your health insurance within 30 days of birth; it is a qualifying event with a hard deadline.',
          'The car seat must be installed before discharge; some hospitals check it. The baby’s first pediatric visit is usually two to three days after discharge.',
          'Take home: extra diapers, wipes, pads, peri bottle, nipple cream samples, the nasal bulb syringe (the hospital one is the best one), and any paperwork.',
        ],
      },
    ],
  },
  {
    id: 'second-night',
    group: 'after',
    title: 'The second night',
    quick: false,
    summary: 'Baby was sleepy on night one and wants to be held and fed all of night two. Normal, and it passes.',
    sections: [
      {
        p: 'After the alert first hour, most newborns sleep heavily for much of the first day, which lulls parents into expecting more of the same. The second night, they wake up to the world: they want to nurse constantly, fuss the moment they are put down, and sleep only on someone. Nurses call it second night syndrome. The baby is not starving and you have not done anything wrong; cluster feeding on the second night is exactly what signals your body to bring in a full milk supply.',
      },
      {
        ul: [
          'Keep the baby skin-to-skin as much as possible. Partners take shifts holding so the birthing parent gets a stretch of sleep.',
          'Feed whenever the baby roots. Short, frequent feeds are expected; let the baby come off on their own.',
          'Put the baby down drowsy but settled, in the bassinet, on their back. If they wake, try again later; do not fall asleep holding them in the hospital bed or a chair.',
          'Ask the nurse to help with latch and swaddling at 3 a.m. That is what they are there for.',
        ],
      },
    ],
  },
  {
    id: 'mom-recovery',
    group: 'after',
    title: 'Your body after birth',
    quick: false,
    summary: 'Bleeding, soreness, the first bathroom trips, milk coming in, and how long each takes to settle.',
    sections: [
      {
        h: 'Bleeding (lochia)',
        ul: [
          'Days 1 to 4: bright red, like a heavy period, with some small clots. Flow increases when you stand up after lying down and after nursing.',
          'Days 4 to 10: pinkish-brown and lighter.',
          'Up to 4 to 6 weeks: yellowish-white, tapering off.',
          'A sudden return to bright red usually means you did too much; rest. Soaking a pad in an hour or passing clots larger than an egg means call.',
          'Pads only; no tampons or cups until cleared, usually at six weeks.',
        ],
      },
      {
        h: 'Perineum and bathroom',
        ul: [
          'Peri bottle of warm water while peeing and instead of wiping; pat dry front to back.',
          'Ice packs the first 24 hours, then warm sitz baths a few times a day. Witch hazel pads on top of the pad.',
          'Stool softeners as recommended; the first bowel movement is feared and almost always fine. Support the perineum with a clean pad while bearing down gently.',
          'Hemorrhoids are common after pushing and improve over weeks.',
        ],
      },
      {
        h: 'Milk coming in',
        p: 'Around day 3 to 5 breasts become full, heavy, warm, and often engorged. Frequent feeding is the fix; cold packs between feeds, and softening the areola by hand expression before latching if the baby struggles. It settles in a day or two. See the newborn guide for latch and engorgement details.',
      },
      {
        h: 'Everything else',
        ul: [
          'Cramping (afterpains), especially while feeding. Night sweats for a week or two as fluid shifts. Swollen feet that resolve. Shaking right after birth.',
          'Fatigue that is deeper than you expected. Sleep when the baby sleeps is cliché because it is the only thing that works.',
          'Hair loss around three to four months, mood swings in the first two weeks (baby blues), hemorrhoids, and leaking when you sneeze; pelvic floor exercises help, and a pelvic floor physical therapist is worth asking for.',
          'Sex, tampons, and swimming after the six-week check, when you feel ready. Contraception comes up at that visit; breastfeeding is not reliable contraception on its own.',
        ],
      },
    ],
  },
  {
    id: 'postpartum-warning',
    group: 'after',
    title: 'Postpartum warning signs',
    quick: true,
    summary: 'The short list for the first six weeks. Partners should know this list too.',
    tools: ['gotime'],
    sections: [
      {
        h: 'Call 911',
        ul: [
          'Chest pain or trouble breathing.',
          'A seizure.',
          'Thoughts of hurting yourself or the baby.',
          'Heavy bleeding that soaks more than one pad an hour, or you feel faint.',
        ],
      },
      {
        h: 'Call your provider today',
        ul: [
          'Bleeding that soaks a pad in an hour, or clots bigger than an egg.',
          'Fever of 100.4 °F (38 °C) or higher.',
          'An incision or tear that is red, swollen, opening, or oozing.',
          'A red, swollen, painful area in one leg (calf or thigh).',
          'A headache that does not improve with rest and acetaminophen, or any headache with vision changes.',
          'Foul-smelling discharge, or pain or burning when peeing that is getting worse.',
          'A hot, red, painful area on a breast with fever or flu-like feelings.',
          'Not being able to sleep when the baby sleeps, constant anxiety, hopelessness, or feeling disconnected from the baby for more than two weeks, or sooner if it is severe.',
        ],
      },
      {
        p: 'When you call, begin with “I gave birth [X] days ago.” The postpartum period changes how symptoms are interpreted, and staff need that context immediately.',
      },
      {
        tip: 'Support lines in the US: Postpartum Support International, 1-800-944-4773 (call or text “HELP”), and the National Maternal Mental Health Hotline, 1-833-852-6262, both free and 24/7. The 988 Suicide & Crisis Lifeline is for emergencies.',
      },
    ],
  },
  {
    id: 'baby-blues',
    group: 'after',
    title: 'Baby blues, depression, and anxiety',
    quick: false,
    summary: 'Eight in ten new mothers get the blues. One in seven develops something that needs treatment. How to tell them apart.',
    sections: [
      {
        h: 'Baby blues',
        p: 'Tearfulness, mood swings, irritability, overwhelm, and trouble sleeping, peaking around day 3 to 5 and fading within two weeks. Driven by the hormone crash and sleep loss. Rest, food, help, and reassurance are the treatment.',
      },
      {
        h: 'Postpartum depression or anxiety',
        ul: [
          'Lasts beyond two weeks, or starts later (any time in the first year).',
          'Persistent sadness, emptiness, or hopelessness; or constant worry, racing thoughts, dread, a sense that something terrible will happen.',
          'Not being able to sleep even when the baby sleeps.',
          'Loss of interest, difficulty bonding, rage or irritability, guilt that you are a bad parent.',
          'Intrusive thoughts: unwanted, upsetting images of harm coming to the baby. These are common in postpartum anxiety and do not mean you want to act on them. Telling someone is the fastest way to relief.',
          'Treatment works: therapy, support groups, and medications that are compatible with breastfeeding. Your OB, midwife, or the baby’s pediatrician can start the process at any visit.',
        ],
      },
      {
        h: 'Partners',
        ul: [
          'You are the one most likely to notice. Ask directly: “How are you really doing?” and “Are you sleeping when you get the chance?”',
          'Partners get postpartum depression too, about one in ten. The same resources apply.',
          'Protect sleep: one four- to five-hour stretch for her per night makes a measurable difference. Take the baby, use pumped milk or formula if that is the plan, or bring the baby to her to nurse and then take over.',
        ],
      },
      {
        warn: 'Postpartum psychosis is rare (1 to 2 per 1,000) and an emergency: confusion, hallucinations, paranoia, not sleeping for days, rapid mood swings, or beliefs that are out of touch with reality, usually in the first two weeks. Do not leave her alone; call 911 or go to the emergency department.',
      },
    ],
  },

  // ---------------------------------------------------------------- GET READY
  {
    id: 'go-bag',
    group: 'prep',
    title: 'The go bag',
    quick: false,
    summary: 'Pack by 36 weeks and leave it by the door or in the car. Three bags: hers, the partner’s, the baby’s.',
    tools: ['gotime'],
    sections: [
      {
        h: 'For her',
        ul: [
          'ID, insurance card, two printed copies of the birth plan, hospital pre-registration paperwork.',
          'Phone, an extra-long charging cable (outlets are far from the bed), headphones.',
          'Her own pillow in a colored pillowcase so it does not get lost in hospital linens.',
          'Lip balm, hair ties or a headband, toiletries, dry shampoo, face wipes, a travel fan.',
          'A robe or zip-front hoodie, a nursing bra or tank, loose socks with grips, slippers, flip-flops for the shower.',
          'Going-home outfit sized for about six months pregnant. Nothing tight at the waist.',
          'Snacks and electrolyte drinks, a water bottle with a straw, honey sticks or glucose chews for energy in labor.',
          'Massage tools: tennis balls in a sock, a rice sock for heat, unscented lotion.',
          'A small speaker or a playlist, a battery candle, an eye mask and earplugs for the postpartum ward.',
          'Adult disposable underwear (many prefer them to hospital mesh), an upside-down peri bottle if you have a favorite, nipple cream.',
          'Nursing pillow if you have one; it is bulky but useful.',
        ],
      },
      {
        h: 'For the partner',
        ul: [
          'A button-down or zip shirt for skin-to-skin.',
          'Two changes of clothes, toiletries, a toothbrush, deodorant, swim trunks for shower or tub support.',
          'Your own pillow and a blanket; the pull-out couch is not generous.',
          'Snacks for both, cash and a card for vending machines and parking, a refillable bottle.',
          'A charger, the list of people to text, entertainment for a long early labor or induction.',
          'A copy of this guide on your phone: Bloom works offline.',
        ],
      },
      {
        h: 'For the baby',
        ul: [
          'The car seat, installed and ideally checked by a certified technician before labor. Know how the straps adjust.',
          'Two going-home outfits in different sizes (newborn and 0 to 3 months), a hat, socks or footed sleeper, a swaddle blanket.',
          'A pacifier if you plan to use one; the hospital may provide.',
          'Mittens or a baby nail file.',
          'The hospital supplies diapers, wipes, formula if needed, a hat, blankets, and the bulb syringe. Take leftovers home.',
        ],
      },
      {
        h: 'Leave at home',
        ul: ['Jewelry and valuables.', 'Too many baby clothes; they wear a diaper and a swaddle.', 'Anything scented.'],
      },
    ],
  },
  {
    id: 'go-time-card',
    group: 'prep',
    title: 'Your go-time card',
    quick: false,
    summary: 'The hospital, the correct entrance, who to call and when, and a ready-to-send message. Fill it in once.',
    tools: ['gotime'],
    sections: [
      {
        p: 'Open the Go-time card tool and fill it in before 36 weeks. It lives on the phone, works offline, and is one tap from the contraction timer. Things to put in it:',
      },
      {
        ul: [
          'Hospital name and address, with the maps link checked once by actually driving it, including where to park at night.',
          'The entrance. Past 20 weeks, many hospitals send laboring patients straight to Labor & Delivery triage, which can be a different entrance than the main ER, and after-hours access may be through the ER doors with a direction to “ask for L&D.” Ask at your 36-week visit exactly where to walk in at 3 a.m.',
          'Phone numbers: your provider’s office, the after-hours line, Labor & Delivery triage, your doula, the pediatrician, and whoever is watching pets or older kids. Note when to call each.',
          'The go-time message, written in advance, so the partner can send one text to everyone instead of fielding twenty calls. Include a line asking people to wait for updates rather than calling.',
        ],
      },
    ],
  },
  {
    id: 'car-and-house',
    group: 'prep',
    title: 'Car, house, and the week before',
    quick: false,
    summary: 'The small logistics that make the day smoother, done ahead.',
    sections: [
      {
        ul: [
          'Car seat installed rear-facing in the back seat; checked at an inspection station or by a certified technician (many fire departments and hospitals do this free).',
          'Gas tank above half from 37 weeks on. A towel and a trash bag on the back seat.',
          'Phone numbers on the go-time card; both phones charged nightly; a backup battery in the bag.',
          'A plan for pets and older children, including a backup person, with keys handed over.',
          'Freezer meals, paper plates, a stocked pantry, and a list of people who offered help with specific jobs assigned (dog walking, grocery run, laundry).',
          'Postpartum supplies at home: heavy pads, peri bottle, witch hazel pads, stool softener as advised, nipple cream, breast pads, a nursing pillow, a water bottle for every room, and easy one-handed snacks.',
          'Baby basics: a safe sleep space ready (bassinet or crib, firm flat mattress, fitted sheet only), diapers in newborn and size 1, wipes, a few sleepers, swaddles, a digital rectal thermometer, nail file, bulb syringe, and a pediatrician chosen with the first visit timing understood.',
          'Insurance: know how to add the baby within 30 days. Leave paperwork submitted. A simple will and guardianship designation if you have been putting it off.',
        ],
      },
    ],
  },
  {
    id: 'questions-36',
    group: 'prep',
    title: 'Questions for the 36-week visit',
    quick: false,
    summary: 'Ask these before labor so the answers are already on the go-time card.',
    tools: ['gotime', 'birthplan'],
    sections: [
      {
        ul: [
          'What is your rule for when to come in? 5-1-1, 4-1-1, or something else for me specifically?',
          'Where exactly do I enter the hospital, day and night, and do you want me to call first? What number?',
          'My GBS result, and what it means for when I come in if my water breaks.',
          'Can I eat and drink in labor? Use the shower or tub? Have intermittent monitoring?',
          'Which members of your group might be on call, and have they seen my birth plan?',
          'How do you handle going past 41 weeks? When would you discuss induction and what method do you usually start with?',
          'Will there be a lactation consultant available, and how do I request one?',
          'What is your policy on delayed cord clamping, skin-to-skin, and delayed newborn bath?',
          'If I had high blood pressure at any visit: do I need a home cuff and a blood pressure check in the first week after birth?',
          'Who do I call after hours in the first weeks postpartum, and for what?',
        ],
      },
    ],
  },
  {
    id: 'risks-going-long',
    group: 'prep',
    title: 'What the due date really means',
    quick: false,
    summary: 'Five percent of babies arrive on their due date. What “term” means, and why 41 weeks is a planning point rather than a deadline.',
    sections: [
      {
        ul: [
          'Early term: 37 weeks 0 days to 38 weeks 6 days. Full term: 39 weeks 0 days to 40 weeks 6 days. Late term: 41 weeks 0 days to 41 weeks 6 days. Post-term: 42 weeks and beyond.',
          'For a first pregnancy, the average spontaneous arrival is a few days past the due date; about half of first-time mothers are still pregnant at 40 weeks 5 days.',
          'From 41 weeks, the small risks of waiting start to rise: stillbirth (still very low in absolute terms), low amniotic fluid, meconium in the fluid, a larger baby, and cesarean. This is why providers offer monitoring at 41 weeks and recommend delivery by 42.',
          'Things that may encourage labor at term with reasonable evidence or at least no harm: walking, nipple stimulation (ask first), sex if membranes are intact, membrane sweeps from 39 weeks. Things without evidence: spicy food, pineapple, most teas. Castor oil works for some and causes miserable diarrhea for everyone; ask your provider before trying it.',
          'The last week is hard. Plan something for each day so you are not waiting by the phone.',
        ],
      },
    ],
  },
];

const GUIDE_SOURCES = [
  { name: 'American College of Obstetricians and Gynecologists (ACOG)', url: 'https://www.acog.org/womens-health' },
  { name: 'AWHONN POST-BIRTH warning signs', url: 'https://www.awhonn.org/education/hospital-products/post-birth-warning-signs-education-program/' },
  { name: 'American Academy of Pediatrics, HealthyChildren.org', url: 'https://www.healthychildren.org' },
  { name: 'CDC: pregnancy, infant feeding, and safe sleep', url: 'https://www.cdc.gov' },
  { name: 'Academy of Breastfeeding Medicine clinical protocols', url: 'https://www.bfmed.org/protocols' },
  { name: 'Lamaze International', url: 'https://www.lamaze.org' },
  { name: 'Postpartum Support International', url: 'https://www.postpartum.net' },
  { name: 'Penny Simkin, The Birth Partner', url: 'https://www.pennysimkin.com' },
];
