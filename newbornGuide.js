// newbornGuide.js — Newborn care, feeding, and recovery reference for Bloom.
// Plain-language guidance drawn from the American Academy of Pediatrics,
// the CDC, the Academy of Breastfeeding Medicine, and ACOG. Educational only;
// the pediatrician and the birthing parent's provider always take precedence.

// Expected diaper output by day of life (day 1 = the day of birth), for a
// breastfed newborn. Formula-fed babies wet similarly and often stool less.
const OUTPUT_EXPECTATIONS = [
  { day: 1, wet: 1, dirty: 1, stool: 'black and tarry (meconium)' },
  { day: 2, wet: 2, dirty: 2, stool: 'black to dark green (meconium)' },
  { day: 3, wet: 3, dirty: 3, stool: 'greenish-brown, looser (transitional)' },
  { day: 4, wet: 4, dirty: 3, stool: 'green to yellow, soft (transitional)' },
  { day: 5, wet: 5, dirty: 3, stool: 'yellow, seedy, loose' },
  { day: 6, wet: 6, dirty: 3, stool: 'yellow, seedy, loose' },
];

const NEWBORN_GUIDE_GROUPS = [
  { id: 'feeding', title: 'Feeding' },
  { id: 'output', title: 'Diapers & output' },
  { id: 'care', title: 'Daily care' },
  { id: 'sleep', title: 'Sleep & soothing' },
  { id: 'health', title: 'Health & safety' },
  { id: 'growing', title: 'Growing & developing' },
  { id: 'mom', title: 'Mom’s recovery' },
  { id: 'home', title: 'Home & logistics' },
];

const NEWBORN_GUIDE = [
  // ---------------------------------------------------------------- FEEDING
  {
    id: 'first-feeds',
    group: 'feeding',
    title: 'The first feeds and colostrum',
    quick: true,
    summary: 'Tiny stomach, concentrated milk, frequent feeds. Why the first hour and the first days matter so much.',
    sections: [
      {
        p: 'For the first two to five days you make colostrum: thick, yellowish, and produced in small amounts, which is exactly right for a stomach the size of a cherry on day one and a walnut by day three. It is dense in antibodies and calories and acts as a laxative to clear meconium. Frequent, early removal of colostrum is the signal that sets up your long-term supply.',
      },
      {
        ul: [
          'Aim for the first feed within the first hour, during skin-to-skin, while the baby is alert. Even licking and nuzzling counts.',
          'After that first window most babies sleep heavily for several hours. Offer the breast at least every two to three hours from the start of one feed to the start of the next, waking the baby if needed. Eight to twelve feeds in 24 hours is the target in the early weeks.',
          'Feeds may be short and sleepy or long and sporadic. Both are fine on days one and two.',
          'If the baby will not latch, hand-express colostrum into a spoon and feed it; the nurse or lactation consultant will show you. Hand expression in the first hours is a skill worth learning for its own sake.',
          'The second night the baby usually wakes up and wants to feed constantly. That cluster feeding is what brings your milk in on days three to five.',
        ],
      },
      {
        tip: 'Early and frequent breastfeeding in the first days is strongly associated with better milk supply and longer, easier breastfeeding. There is no exact multiplier, but the direction is clear and the window is short.',
      },
    ],
  },
  {
    id: 'latch',
    group: 'feeding',
    title: 'Getting a deep latch',
    quick: true,
    summary: 'Most nipple pain and most “not enough milk” problems come down to a shallow latch. The fix is mechanical.',
    sections: [
      {
        h: 'Set up',
        ol: [
          'Get comfortable first: back supported, feet up, pillows under the baby so you are not hunching. You will be here a while.',
          'Baby tummy to tummy with you, body in a straight line (ear, shoulder, hip), head free to tilt back slightly. Not twisted toward you.',
          'Nose to nipple. Start with the baby’s nose level with your nipple so they have to tip their head back and reach up.',
        ],
      },
      {
        h: 'The latch',
        ol: [
          'Tickle the upper lip with the nipple and wait for a wide gape, like a yawn. Be patient; wait for the wide one.',
          'At the widest point bring the baby quickly onto the breast, chin first, with the nipple aimed at the roof of the mouth. Bring baby to breast, not breast to baby.',
          'Shape the breast with your hand like a sandwich in the same direction as the baby’s mouth if that helps get more in.',
          'A good latch: lips flanged out, chin pressed into the breast, nose free or nearly so, more areola visible above the top lip than below, cheeks rounded, slow deep sucks with swallows you can hear or see.',
        ],
      },
      {
        h: 'If it hurts',
        ul: [
          'Some tenderness in the first 30 seconds and the first week is common. Toe-curling pain that lasts the whole feed, or pain that makes you dread feeds, is a latch problem.',
          'Break the suction with a clean finger in the corner of the mouth and try again. Never pull the baby off.',
          'A nipple that comes out flattened, creased, or lipstick-shaped means it is being compressed; go deeper.',
          'Clicking sounds, slipping off, and milk dribbling can mean a shallow latch or a tongue-tie. Ask for an evaluation.',
          'Expressed milk or lanolin on the nipple after feeds, air-dry, and hydrogel pads help skin heal. Cracked or bleeding nipples deserve a lactation visit this week, not next month.',
        ],
      },
      {
        tip: 'Laid-back nursing (you reclined, baby on your chest, letting them find the breast) uses the baby’s reflexes and often fixes a latch that fails in the cross-cradle hold.',
      },
    ],
  },
  {
    id: 'how-often',
    group: 'feeding',
    title: 'How often and how long',
    quick: true,
    summary: 'Eight to twelve feeds a day, on cue, both sides offered. The clock is a backstop, not a schedule.',
    sections: [
      {
        h: 'Feeding cues (feed at the early ones)',
        ul: [
          'Early: stirring, mouth opening, turning the head and rooting, hands to mouth, lip smacking.',
          'Active: stretching, increasing movement, fussing, hand sucking.',
          'Late: crying, turning red, frantic movement. A crying baby latches poorly; calm them skin-to-skin first.',
        ],
      },
      {
        h: 'The rhythm',
        ul: [
          'Expect 8 to 12 feeds in 24 hours, so every 2 to 3 hours from the start of one feed to the start of the next, with some clustered closer together.',
          'In the first two weeks, do not let the baby go longer than about 3 hours in the day or 4 at night without feeding, until they are back to birth weight and the pediatrician says it is fine to let them sleep. After that, follow the baby.',
          'A feed can last 10 to 45 minutes. Let the baby finish the first side (they come off or fall asleep, breast feels softer) before offering the second. The second side may be refused; start there next time.',
          'Breast compressions (gently squeezing the breast while the baby sucks) keep a sleepy baby swallowing.',
          'Waking a sleepy newborn: unswaddle, strip to a diaper, skin-to-skin, change the diaper, rub the back or feet, a cool cloth on the forehead, switch sides when sucking slows.',
        ],
      },
      {
        p: 'Bloom’s nursing timer logs each side and the Home card shows feeds in the last 24 hours so you are not doing this arithmetic at 3 a.m.',
      },
    ],
  },
  {
    id: 'enough-milk',
    group: 'feeding',
    title: 'Is the baby getting enough?',
    quick: true,
    summary: 'You cannot see the ounces, so you use the outputs: diapers, weight, and what you see at the breast.',
    sections: [
      {
        h: 'Reassuring signs',
        ul: [
          'Diapers on track for the day of life (see Diapers & output). By day five: six or more heavy wet diapers and three or more yellow stools a day.',
          'Weight: a loss of up to 7 to 10 percent in the first days, then regaining birth weight by 10 to 14 days, then gaining about 5 to 7 ounces (150 to 200 g) a week for the first three months.',
          'At the breast: audible or visible swallowing, a rhythm of suck-suck-swallow, the breast softer after the feed, the baby relaxed and loose-handed when done.',
          'Between feeds: content for at least a short stretch, alert periods, skin that springs back, a moist mouth.',
          'From day three to five, your breasts feel fuller before feeds and softer after.',
        ],
      },
      {
        h: 'Call the pediatrician or a lactation consultant if',
        ul: [
          'Fewer wet or dirty diapers than expected for the day, or orange-red “brick dust” crystals in the diaper after day four.',
          'Weight loss over 10 percent, or not back to birth weight by two weeks.',
          'Very sleepy and hard to wake for feeds, or fussy and unsatisfied after nearly every feed.',
          'Yellow skin spreading to the belly or legs, dark urine, or pale stools.',
          'Your milk does not seem to have come in by day five, or feeds are painful throughout.',
        ],
      },
      {
        tip: 'Do not judge supply by what you can pump. A pump is less effective than a well-latched baby, and output varies by time of day and by pump. Judge by the baby.',
      },
    ],
  },
  {
    id: 'cluster-growth',
    group: 'feeding',
    title: 'Cluster feeding and growth spurts',
    quick: true,
    summary: 'Hours of back-to-back feeding, usually in the evening. Not a supply problem. Here is when to expect it.',
    sections: [
      {
        p: 'Cluster feeding means several feeds bunched close together, often from late afternoon through the evening, with the baby fussing, latching, dozing, and waking to latch again. It is most intense on the second night and during growth spurts, and it is how the baby orders up more milk. Supply follows demand with a lag of a day or two.',
      },
      {
        h: 'Typical growth spurt timing',
        ul: ['Days 7 to 10.', 'Two to three weeks.', 'Four to six weeks.', 'Three months.', 'Four months (often with sleep disruption).', 'Six months.'],
      },
      {
        h: 'Getting through it',
        ul: [
          'Settle in: water, snacks, phone, remote, pillows. Hand the baby back and forth between feeds if a partner is home.',
          'Keep offering the breast. Topping up with formula during a cluster, unless medically advised, tells your body to make less.',
          'It usually lasts two to three days per spurt, then feeds space out again, often followed by a longer sleep stretch.',
          'Evening fussiness and cluster feeding overlap with the normal crying peak at six to eight weeks. Both pass.',
        ],
      },
    ],
  },
  {
    id: 'positions',
    group: 'feeding',
    title: 'Nursing positions',
    quick: false,
    summary: 'Five holds. Learn two well, then try others when one stops working.',
    sections: [
      {
        ul: [
          'Cross-cradle: baby across your lap, supported by the opposite arm, your hand behind their shoulders and neck (not the back of the head). Best for learning because you control the latch.',
          'Football (clutch): baby tucked under your arm on the same side, feet toward your back. Good after a cesarean, for large breasts, and for small or sleepy babies.',
          'Laid-back: you reclined at 45 degrees, baby lying on your chest, gravity holding them on. Triggers the baby’s own feeding reflexes; excellent for latch problems and a fast letdown.',
          'Cradle: the classic, baby’s head in the crook of your elbow. Easier once latching is reliable.',
          'Side-lying: both of you on your sides facing each other. For night feeds and sore bottoms; make sure the baby goes back to their own sleep space afterward.',
        ],
      },
      {
        tip: 'In every position: baby’s whole body faces you, ear-shoulder-hip in a line, and you bring the baby up to breast height with pillows rather than leaning down. Shoulders and neck pain is a positioning problem.',
      },
    ],
  },
  {
    id: 'engorgement',
    group: 'feeding',
    title: 'Engorgement when milk comes in',
    quick: false,
    summary: 'Days three to five: hard, hot, heavy breasts. Frequent feeds, cold packs, and a softened areola get you through 24 to 48 hours.',
    sections: [
      {
        ul: [
          'Feed often, at least every two to three hours, including at night. Removal is the treatment.',
          'If the areola is too firm for the baby to latch, soften it first: reverse pressure softening (press gently with fingertips around the base of the nipple for a minute to push swelling back) or hand-express a little milk.',
          'Cold packs or chilled cabbage leaves between feeds for 15 to 20 minutes reduce swelling and pain. Warmth for a minute or two just before a feed can help letdown; avoid prolonged heat.',
          'Avoid pumping to empty during engorgement; it tells the body to make even more. A minute or two of pumping or hand expression to comfort is fine.',
          'A supportive, non-wired bra. Anti-inflammatory pain relief if your provider has cleared it.',
          'It peaks and settles within a day or two as supply matches demand.',
        ],
      },
      {
        warn: 'A red, hot, painful wedge on one breast with fever or flu-like aches is mastitis. Keep feeding on that side, rest, use cold, and call your provider the same day.',
      },
    ],
  },
  {
    id: 'mastitis',
    group: 'feeding',
    title: 'Clogged ducts and mastitis',
    quick: false,
    summary: 'Current guidance has changed: gentle, not aggressive. Keep feeding normally, cool it down, and call early.',
    sections: [
      {
        p: 'A clogged duct is a tender lump or wedge; mastitis is inflammation of the breast tissue, sometimes with infection, causing redness, heat, pain, fever, and feeling ill. The Academy of Breastfeeding Medicine updated its protocol in 2022, and the advice is now the opposite of much older internet advice.',
      },
      {
        h: 'Do',
        ul: [
          'Keep feeding on your normal schedule from both sides. Do not add extra pumping sessions to “empty” the breast; over-removal worsens inflammation.',
          'Cold packs between feeds, 10 to 15 minutes at a time.',
          'Gentle lymphatic drainage: light stroking from the nipple toward the armpit and collarbone, like petting a cat, not deep massage.',
          'Rest, fluids, a supportive bra that is not tight. Anti-inflammatory medication if cleared by your provider.',
          'Call your provider the same day if you have fever, flu-like symptoms, or redness that is spreading. Antibiotics may be needed and work best started early.',
        ],
      },
      {
        h: 'Avoid',
        ul: ['Deep, painful massage or vibrating tools.', 'Heat for long periods.', 'Dangle feeding, Epsom salt soaks, and other forceful “unclogging” methods.', 'Suddenly stopping feeding on the affected side.'],
      },
    ],
  },
  {
    id: 'pumping',
    group: 'feeding',
    title: 'Pumping and milk storage',
    quick: false,
    summary: 'When to start, how to fit it in, and the storage rules that matter.',
    sections: [
      {
        h: 'When',
        ul: [
          'If breastfeeding is going well, there is no need to pump in the first few weeks unless you are separated from the baby, building a stash for a return to work, or advised to for supply or weight reasons.',
          'Introducing a bottle of expressed milk around three to four weeks, once latch is established, keeps the option open; some babies refuse bottles if first offered much later.',
          'Pumping after a morning feed, when supply is highest, is the easiest place to find an extra ounce or two.',
          'If the baby cannot feed directly (NICU, latch problems), pump 8 to 12 times a day from the first day, including at least once overnight, to establish supply. Hospital-grade pumps are best for this.',
        ],
      },
      {
        h: 'Technique',
        ul: [
          'Flange fit matters more than anything. The nipple should move freely in the tunnel without much areola pulled in; pain or redness means the wrong size. Many people need a smaller flange than the standard one.',
          'Use the highest comfortable suction, not the highest suction. Pain reduces output.',
          'Hands-on pumping (massage and compressions while pumping) increases yield significantly.',
          'Output varies widely; 0.5 to 2 ounces total from both sides after a feed is normal.',
        ],
      },
      {
        h: 'Storage (CDC guidance)',
        ul: [
          'Freshly expressed: up to 4 hours at room temperature, up to 4 days in the refrigerator, best within 6 months in the freezer (acceptable up to 12).',
          'Thawed: use within 24 hours in the refrigerator, within 2 hours once at room temperature. Never refreeze.',
          'Leftover milk from a bottle the baby drank from: use within 2 hours, then discard.',
          'Label with the date. Store in 2 to 4 ounce portions to limit waste. Thaw in the fridge overnight or in warm water; never microwave.',
          'Milk separates when stored; swirl, do not shake hard. A soapy or metallic smell after storage can be from high lipase; it is safe, though some babies refuse it.',
        ],
      },
    ],
  },
  {
    id: 'bottle-feeding',
    group: 'feeding',
    title: 'Bottle feeding and nipple flow',
    quick: true,
    summary: 'Paced feeding, slow-flow nipples, and how much is typical. Works for pumped milk and formula alike.',
    sections: [
      {
        h: 'Paced bottle feeding',
        ol: [
          'Hold the baby fairly upright, head supported, not lying flat.',
          'Hold the bottle horizontally so milk just fills the nipple tip. The baby has to work to draw it, as at the breast.',
          'Touch the nipple to the upper lip and let the baby pull it in with a wide mouth.',
          'Every 20 to 30 seconds, or after several swallows, tip the bottle down to pause. Let the baby breathe and decide whether they want more.',
          'Switch sides halfway, as you would at the breast. A feed should take 15 to 20 minutes; a bottle gulped in five means the flow is too fast.',
          'Stop when the baby shows fullness: slowing, turning away, hands relaxing, falling asleep. Do not coax the last ounce.',
        ],
      },
      {
        h: 'Nipple flow',
        ul: [
          'Start with the slowest flow available (preemie, newborn, or level 1) and stay there as long as it works, especially for a baby who also breastfeeds.',
          'Signs the flow is too fast: gulping, coughing, milk spilling from the corners of the mouth, wide eyes, pulling off, finishing too quickly.',
          'Signs it is too slow: sucking hard with little swallowing, frustration, falling asleep early, collapsed nipple.',
          'Flow varies by brand even at the same level. There is no need to move up levels on a schedule.',
        ],
      },
      {
        h: 'How much',
        ul: [
          'Days one to three: often 0.5 to 1 ounce (15 to 30 ml) per feed, increasing daily.',
          'By two weeks: around 2 to 3 ounces (60 to 90 ml) every 2 to 3 hours.',
          'By one month: around 3 to 4 ounces (90 to 120 ml) every 3 to 4 hours.',
          'A rough rule for the first months is about 2.5 ounces per pound of body weight per day, leveling off around 32 ounces a day. The pediatrician will tailor this to your baby’s growth.',
          'Breastfed babies taking expressed milk need less than formula-fed babies of the same age, typically 1 to 1.5 ounces per hour away from the breast.',
        ],
      },
      {
        h: 'Keeping it clean',
        p: 'Wash bottles and nipples in hot soapy water or the dishwasher after every use and let them air dry. Sanitizing (boiling, steam, or the dishwasher sanitize cycle) once a day is recommended for babies under about three months, premature babies, and any baby with a weakened immune system. Wash your hands before preparing feeds.',
      },
    ],
  },
  {
    id: 'formula-prep',
    group: 'feeding',
    title: 'Preparing formula safely',
    quick: true,
    summary: 'Powdered formula is not sterile. Here is the safe method for a newborn, from the CDC and WHO.',
    sections: [
      {
        p: 'Powdered infant formula can contain Cronobacter, a bacterium that is rare but dangerous for babies under two months, premature babies, and immunocompromised babies. Liquid ready-to-feed and concentrate formulas are sterile until opened. The following reduces the risk to near zero.',
      },
      {
        h: 'For babies under two months (or premature or immunocompromised)',
        ol: [
          'Prefer ready-to-feed or liquid concentrate when you can. If you use powder, use the hot-water method below.',
          'Wash hands, clean the counter, and start with a clean, dry bottle.',
          'Boil water and let it cool for no more than five minutes, so it is still at least 158 °F (70 °C).',
          'Pour the measured water into the bottle first, then add the exact number of level scoops. Water first, then powder, every time.',
          'Cap and swirl until dissolved.',
          'Cool quickly to body temperature by holding the bottle under cold running water or in a bowl of ice water, keeping the nipple dry. Test on your wrist: it should feel warm, not hot.',
        ],
      },
      {
        h: 'Rules that apply at every age',
        ul: [
          'Follow the can exactly. Never add extra water to stretch formula or extra powder to make it “richer.” Both can make a baby sick.',
          'Use the scoop that came with that container; scoops differ between brands.',
          'Use safe water. If you have a well or there is a local boil-water advisory, boil water first regardless of age.',
          'Feed within 2 hours of preparing, and within 1 hour of the baby starting to drink. Discard what is left; saliva introduces bacteria.',
          'Prepared formula the baby has not touched can be refrigerated for up to 24 hours. Opened ready-to-feed or concentrate: refrigerate and use within 48 hours.',
          'Never microwave formula or milk; it heats unevenly and can scald the mouth.',
          'Keep the powder container closed, dry, and used within a month of opening.',
        ],
      },
      {
        h: 'Choosing a formula',
        p: 'Any FDA-regulated infant formula meets the same nutritional requirements. Start with a standard cow’s milk based formula unless the pediatrician advises otherwise; store brands are nutritionally equivalent to name brands. Switching repeatedly to fix fussiness rarely helps; talk to the pediatrician before changing to a specialty formula. Never make homemade formula or use toddler formula or animal milk for a baby under one year.',
      },
    ],
  },
  {
    id: 'combo-feeding',
    group: 'feeding',
    title: 'Combination feeding',
    quick: false,
    summary: 'Breast plus bottle, pumped or formula. How to do it without losing supply or the latch.',
    sections: [
      {
        ul: [
          'If supply is the goal, nurse first and then offer the bottle, and pump when a bottle replaces a feed. Each skipped breast session without pumping tells your body to make less.',
          'If you are supplementing for medical reasons (weight, jaundice, low supply), the pediatrician or lactation consultant will give amounts; follow them and recheck weight soon.',
          'Paced bottle feeding with a slow nipple keeps the baby willing to work at the breast.',
          'Many families settle on one bottle a day (often the partner’s night shift) with breastfeeding otherwise, which also protects the mother’s sleep.',
          'Mixed feeding is still breastfeeding. Any amount of breast milk carries benefits, and the baby will be fine either way; a fed, rested household is the goal.',
        ],
      },
    ],
  },
  {
    id: 'supply',
    group: 'feeding',
    title: 'Protecting your supply',
    quick: false,
    summary: 'What actually lowers milk supply, what does not, and what to do about a real dip.',
    sections: [
      {
        h: 'Things that can reduce supply',
        ul: [
          'Infrequent or incomplete milk removal: long gaps, scheduled feeds, routine top-ups without pumping, a shallow latch that does not drain well.',
          'Pseudoephedrine (in many cold and sinus medicines) is well documented to reduce supply. Check with the pharmacist before any medication.',
          'Estrogen-containing birth control, especially in the first months. Progestin-only options are usually fine; discuss timing with your provider.',
          'Large amounts of peppermint, sage, or parsley are traditionally used to dry up milk. The evidence is weak, and a mint tea will not hurt, but if supply is a concern, skip concentrated amounts (menthol cough drops by the bag, peppermint oil, sage tea).',
          'Severe dehydration, significant calorie restriction, illness, smoking, and a retained placenta fragment or significant postpartum blood loss, which can delay milk coming in.',
        ],
      },
      {
        h: 'Things that mostly do not',
        ul: ['One bad day, one missed feed, or a normal cup of coffee.', 'Breast size.', 'What you can pump.', 'The baby cluster feeding (that is demand, not deficit).'],
      },
      {
        h: 'If supply really dips',
        ul: [
          'Feed or pump more often for two to three days; add a session after a morning feed. Breast compressions. Skin-to-skin.',
          'Check the latch and flange fit with a lactation consultant.',
          'Supplements like fenugreek and lactation cookies have little evidence and some side effects; do not spend money on them before fixing removal.',
          'Prescription options exist; ask your provider.',
        ],
      },
      {
        tip: 'Essential oils, including peppermint and lavender, should not be applied to the breasts, to the baby’s skin, or diffused in the baby’s room. Menthol and some other oils can cause breathing problems in infants, and there is no benefit that outweighs that.',
      },
    ],
  },
  {
    id: 'vitamin-d',
    group: 'feeding',
    title: 'Vitamin D and other supplements',
    quick: false,
    summary: 'Breastfed babies need vitamin D drops from the first days. Most other supplements are unnecessary.',
    sections: [
      {
        ul: [
          'The AAP recommends 400 IU of vitamin D daily for all breastfed and partially breastfed babies, starting in the first few days, and for formula-fed babies drinking less than about 32 ounces a day. Ask the pediatrician which drops; concentrations vary and some products deliver the full dose in a single drop.',
          'Iron: full-term breastfed babies have stores through about four to six months; the pediatrician will advise at that point. Formula is iron-fortified.',
          'Probiotics, gripe water, and gas drops: limited evidence; ask before using. Nothing by mouth other than milk, prescribed medication, and vitamin D in the first months without the pediatrician’s okay.',
          'No water before six months (it can dangerously dilute sodium), no honey before one year (botulism), no cow’s milk as a drink before one year.',
        ],
      },
    ],
  },

  // ---------------------------------------------------------------- OUTPUT
  {
    id: 'output-by-day',
    group: 'output',
    title: 'Diapers by day of life',
    quick: true,
    summary: 'What goes in shows up in the diaper. The expected minimums for each of the first days, and what the colors mean.',
    sections: [
      {
        p: 'Diaper counts are the best at-home measure of whether feeding is working, because they respond within a day. Count a wet diaper as roughly three tablespoons of fluid or more (a dry diaper with the same amount of water poured in is a useful calibration); modern diapers have a wetness line that helps. Day 1 is the day of birth.',
      },
      {
        ul: [
          'Day 1: at least 1 wet and 1 stool. Stool is black, sticky, and tarry (meconium).',
          'Day 2: at least 2 wet and 2 stools. Still meconium, maybe dark green.',
          'Day 3: at least 3 wet and 3 stools. Stools turning greenish-brown and looser as milk increases.',
          'Day 4: at least 4 wet, heavier now, and 3 or more stools turning green-yellow.',
          'Day 5: at least 5 to 6 wet and 3 to 4 yellow, seedy, loose stools. Breast milk stools look like mustard with sesame seeds and smell mild.',
          'Day 6 onward: 6 or more heavy wets and 3 or more yellow stools a day for breastfed babies. Formula-fed babies have tan to yellow-brown, pastier stools, often 1 to 4 a day.',
          'After about 4 to 6 weeks, some breastfed babies switch to stooling every few days, even once a week, with large soft stools. If the baby is comfortable and gaining, that is normal. Wet diapers stay at 6 or more.',
        ],
      },
      {
        h: 'Call the pediatrician',
        ul: [
          'Fewer wet diapers than the day number in the first week, or no wet diaper in 6 to 8 hours at any age.',
          'Still passing meconium on day 5, or no stool in the first 48 hours of life.',
          'Orange or pink “brick dust” urate crystals in the diaper after day 4 (normal on days 1 to 3).',
          'Red or bloody stool, white, chalky, or pale gray stool, or black stool after the meconium days.',
          'Watery, explosive, very frequent stools with other signs of illness, or hard pellets.',
        ],
      },
      {
        tip: 'Bloom’s Home screen compares today’s logged diapers against the expected minimum for the baby’s day of life during the first weeks, and the Day editor lets you record stool color.',
      },
    ],
  },
  {
    id: 'diapering',
    group: 'output',
    title: 'Diaper changes: girls, boys, and what is normal',
    quick: true,
    summary: 'Front to back, cover the fountain, do not retract, and expect some surprising but normal things in the first week.',
    sections: [
      {
        h: 'Every change',
        ol: [
          'Everything within reach before you start: diaper open and ready, wipes out, cream if needed. Never turn away from a baby on a changing table; keep a hand on them.',
          'Open the dirty diaper, use its front to wipe the bulk, then fold it under the baby clean-side up.',
          'Wipe front to back. Lift legs by the ankles gently; do not pull hard on the legs or fold the baby in half.',
          'Pat dry or let air dry for a moment. Moisture under the diaper is what causes rash.',
          'New diaper: back edge at the waist, front pulled up, tabs snug enough for one finger. Fold the front down below the cord stump until it falls off.',
          'Newborns often pee or poop during or right after a change. Wait a beat before closing.',
        ],
      },
      {
        h: 'Girls',
        ul: [
          'Always wipe front to back to keep stool away from the urethra and vagina.',
          'Clean gently between the labia with a damp cloth, front to back; there is no need to scrub out every trace of white vernix or discharge.',
          'Normal in the first week or two: white or clear discharge, and even a small amount of blood-tinged discharge (a mini-period) caused by your hormones leaving her system.',
        ],
      },
      {
        h: 'Boys',
        ul: [
          'Keep a cloth or a clean diaper over the penis during changes; cool air triggers peeing.',
          'Point the penis down before fastening the diaper to avoid leaks out the top.',
          'Uncircumcised: never pull the foreskin back. It is attached and will separate on its own over years. Clean the outside only.',
          'Circumcised: see the circumcision care topic.',
          'A swollen scrotum at birth (fluid, called a hydrocele) is common and usually resolves within months. Mention it at a visit.',
        ],
      },
      {
        h: 'Diaper rash',
        ul: [
          'Prevention: frequent changes, air time, a thin layer of zinc oxide or petroleum jelly barrier cream if the skin looks pink.',
          'Treatment: thick barrier cream at every change, like frosting; do not wipe it all off each time. Use water and a soft cloth instead of wipes on raw skin.',
          'Call if the rash is bright red with satellite spots (often yeast), blistered, bleeding, or not improving in three days.',
        ],
      },
    ],
  },
  {
    id: 'spit-up',
    group: 'output',
    title: 'Spit-up, gas, and burping',
    quick: false,
    summary: 'Spit-up is laundry, not a medical problem. Here is the line between normal and call-now.',
    sections: [
      {
        ul: [
          'Spit-up: effortless dribbling or a small gush of milk during or after feeds, in about half of all babies, peaking around four months and resolving by a year. If the baby is gaining and content, it is normal regardless of how much it looks like.',
          'Burping: pause after the first side or halfway through a bottle, and at the end. Upright over the shoulder, sitting on your lap leaning forward with your hand supporting the chin, or face-down across your lap. Pat or rub firmly. A burp usually comes within a minute or two; if not, move on.',
          'Keep the baby upright for 15 to 20 minutes after feeds if spit-up is frequent, and avoid pressure on the belly. Do not elevate the crib mattress; it is unsafe and does not help.',
          'Gas is normal and loud. Bicycle legs, tummy time while awake, gentle clockwise belly massage, and a correct bottle technique (nipple full of milk, not air) help.',
        ],
      },
      {
        warn: 'Call the pediatrician right away for forceful, projectile vomiting after most feeds, green or yellow-green vomit, vomit with blood, a belly that is swollen and hard, or vomiting with fewer wet diapers or lethargy.',
      },
    ],
  },

  // ---------------------------------------------------------------- DAILY CARE
  {
    id: 'cord-care',
    group: 'care',
    title: 'Umbilical cord care',
    quick: true,
    summary: 'Keep it dry and leave it alone. It falls off in one to three weeks.',
    sections: [
      {
        ul: [
          'Dry cord care is the standard: no alcohol, no ointment. Keep the stump clean and dry, fold the diaper down below it, and give sponge baths until it falls off.',
          'It dries, darkens, shrivels, and detaches, usually between 1 and 3 weeks (average 10 to 14 days). Do not pull it, even when it is hanging by a thread.',
          'Normal: a slightly unpleasant smell as it dries, a little sticky or crusty discharge, a few drops of blood when it comes off, and a small raw spot that heals in a few days.',
          'If the stump gets dirty with stool, clean around it with plain water and pat dry.',
          'A pink, moist lump that lingers after the stump falls off is a granuloma; the pediatrician treats it in the office in seconds.',
          'A bulge at the navel that gets bigger with crying is an umbilical hernia. Common, painless, and almost always closes on its own by age four or five. Do not tape a coin over it.',
        ],
      },
      {
        warn: 'Call the pediatrician if the skin around the base becomes red and the redness spreads, if there is pus, foul-smelling discharge with redness, swelling, bleeding that does not stop with gentle pressure, or if the baby has a fever or cries when the area is touched. Infection of the stump is rare but serious.',
      },
    ],
  },
  {
    id: 'circumcision-care',
    group: 'care',
    title: 'Circumcision care',
    quick: false,
    summary: 'If you chose circumcision: petroleum jelly, gentle cleaning, and a week to ten days of healing.',
    sections: [
      {
        p: 'Two main techniques are used. With a Gomco or Mogen clamp, the wound is open and heals over about 7 to 10 days. With a Plastibell, a plastic ring stays on and falls off by itself in 5 to 10 days. Your hospital will tell you which was used and give specific instructions; these are the general ones.',
      },
      {
        ul: [
          'At every diaper change, gently clean away stool with warm water and pat dry. Avoid wipes on the wound for the first days.',
          'For a clamp circumcision, apply a generous dab of petroleum jelly to the tip (or on a gauze square placed over it) at every change for about a week so the diaper does not stick.',
          'For a Plastibell, no ointment is usually needed. Do not pull the ring; it will fall off.',
          'Normal healing: redness and swelling for a few days, a yellowish, soft crust or film on the head of the penis for a week or so (this is healing tissue, not pus; do not wipe it off), and a few spots of blood on the diaper in the first day.',
          'Fasten the diaper loosely for the first days. Sponge baths until healed.',
        ],
      },
      {
        warn: 'Call the pediatrician or go in for bleeding more than a few drops or a spot larger than a quarter, no urination within 12 hours of the procedure, redness or swelling that is getting worse after three days, pus or foul discharge, a fever, or a Plastibell ring that has slipped down the shaft or has not fallen off by two weeks.',
      },
      {
        tip: 'Uncircumcised care is simpler: wash the outside with water, never retract the foreskin. Natural separation happens over years.',
      },
    ],
  },
  {
    id: 'bathing',
    group: 'care',
    title: 'Bath time, step by step',
    quick: true,
    summary: 'Sponge baths until the cord is off, then a tub two or three times a week. Warm room, 100 °F water, never a moment alone.',
    sections: [
      {
        h: 'How often',
        p: 'Two or three baths a week is plenty; more dries the skin. Clean the face, neck folds, hands, and diaper area daily. Delaying the very first bath at least 6 to 24 hours after birth is now standard; vernix is good for the skin.',
      },
      {
        h: 'Set up before you start',
        ul: [
          'Warm room, around 75 °F (24 °C), no drafts. Towel (hooded if you have one), washcloths, mild fragrance-free baby cleanser, clean diaper and clothes within reach.',
          'Water about 100 °F (38 °C): comfortably warm on the inside of your wrist or elbow, never hot. Two to three inches in the baby tub. Set your water heater to 120 °F (49 °C) or lower.',
          'Phone on silent and out of reach. If the doorbell rings, the baby comes with you wrapped in a towel. Never leave a baby alone in water, even for a second, even in an inch.',
        ],
      },
      {
        h: 'Sponge bath (until the cord stump is off and any circumcision has healed)',
        ol: [
          'Lay the baby on a towel on a safe flat surface, keep them wrapped, and uncover one part at a time.',
          'Face first with plain water: eyes from the inner corner outward with a fresh part of the cloth for each eye, then around the mouth, nose, and ears (outside only, never inside).',
          'Neck folds, behind the ears, armpits, hands, and between fingers; milk and lint collect in the folds.',
          'Body and legs, then the diaper area last, front to back.',
          'Pat dry, especially folds. Keep the cord dry.',
        ],
      },
      {
        h: 'Tub bath',
        ol: [
          'Undress the baby and lower them in feet first, supporting the head and neck with one arm, your hand gripping under the far armpit. Keep most of their body above water and pour warm water over them to keep them warm.',
          'Face and eyes with plain water first.',
          'Wash the body with a little cleanser on a cloth, folds and diaper area last.',
          'Hair last, since it loses heat fastest: a drop of cleanser, rinse by cupping water over the head with your hand shielding the eyes. Gentle scrubbing of the scalp with a soft brush helps prevent cradle cap.',
          'Lift out onto the towel, cover the head, pat dry, and dress quickly. Lotion is optional; if the skin is dry, a fragrance-free cream is fine.',
        ],
      },
      {
        tip: 'Many babies hate baths for the first weeks. A warm washcloth laid over the chest and belly, a quiet voice, and a quick bath help. If it is miserable, skip it and sponge; there is no rule being broken.',
      },
    ],
  },
  {
    id: 'temperature',
    group: 'care',
    title: 'Temperature: taking it, and keeping the baby warm',
    quick: true,
    summary: 'Rectal is the standard under three months. 100.4 °F is the number. Dress the baby in one more layer than you.',
    sections: [
      {
        h: 'Taking a temperature',
        ul: [
          'Under three months, a rectal temperature with a digital thermometer is the one that counts. Forehead and ear thermometers can screen, but a reading that matters should be confirmed rectally.',
          'How: clean the tip, a dab of petroleum jelly, baby on their back with legs lifted or on their belly across your lap, insert about half an inch (1 to 1.5 cm), hold the thermometer and the baby still until it beeps. Label that thermometer rectal-only.',
          'Normal is roughly 97.7 to 100.3 °F (36.5 to 37.9 °C) rectally.',
          'Do not bundle the baby heavily before checking; it can falsely raise the reading. Recheck 20 minutes after unbundling if you are unsure.',
        ],
      },
      {
        h: 'Keeping warm, not hot',
        ul: [
          'Dress the baby in one more layer than you would wear to be comfortable in the same room. Indoor room temperature around 68 to 72 °F (20 to 22 °C).',
          'Check the back of the neck or the chest, not the hands and feet, which are normally cool and a little blue in the first weeks.',
          'No hats indoors for sleep; babies release heat through the head and overheating is a SIDS risk factor. Sweating, flushed cheeks, rapid breathing, or a hot chest means too many layers.',
          'Newborns cannot shiver effectively; skin-to-skin is the fastest way to warm a cool baby.',
        ],
      },
      {
        warn: 'A rectal temperature of 100.4 °F (38 °C) or higher in a baby under three months is an emergency; call the pediatrician immediately or go to the emergency department, day or night. Do not give fever medicine to a baby under three months unless a provider tells you to. A temperature below 97.7 °F (36.5 °C) that does not come up with skin-to-skin is also a call.',
      },
    ],
  },
  {
    id: 'nails-skin',
    group: 'care',
    title: 'Nails, skin, and scalp',
    quick: false,
    summary: 'Filing not clipping at first, and the catalog of normal newborn skin.',
    sections: [
      {
        h: 'Nails',
        ul: [
          'Newborn nails are soft, grow fast, and scratch. For the first few weeks, file with a fine emery board rather than clip; the nail is attached to the fingertip skin and it is easy to nick.',
          'When you do clip: after a bath when nails are soft, or while the baby is asleep. Press the fingertip pad down and away from the nail, cut along the natural curve, keep toenails straight across.',
          'If you nick the skin, press with a clean cloth until it stops. Do not use a bandage; it is a choking hazard.',
          'Mittens or sleeves folded over the hands are fine for a few days but keep hands free when possible; hands in the mouth are how babies self-soothe.',
        ],
      },
      {
        h: 'Normal skin',
        ul: [
          'Peeling and dry, flaky skin in the first weeks, especially on hands and feet. No treatment needed.',
          'Milia: tiny white bumps on the nose and cheeks. Baby acne: red bumps on the face at two to four weeks, from hormones, gone by a few months. Leave both alone.',
          'Erythema toxicum: blotchy red patches with a small yellow-white center that come and go in the first week. Alarming name, harmless.',
          'Cradle cap: yellow, greasy scales on the scalp. Soften with a little plain oil for 15 minutes, brush gently with a soft brush, shampoo. Not itchy, not contagious.',
          'Stork bites (pink patches on the eyelids, forehead, or nape) fade. Dermal melanocytosis (blue-gray patches on the back or bottom, common in babies with darker skin) fades over years; note it at a visit so it is documented.',
          'Heat rash in folds: cooler, looser clothing.',
        ],
      },
      {
        warn: 'Call for a rash with fever, blisters or pus-filled bumps, a rash that looks like bruises or tiny purple dots, or a spreading red area that is warm or tender.',
      },
    ],
  },
  {
    id: 'eyes-ears-nose',
    group: 'care',
    title: 'Eyes, nose, and ears',
    quick: false,
    summary: 'Crossed eyes, gunky eyes, snuffly breathing, and the bulb syringe.',
    sections: [
      {
        h: 'Eyes',
        ul: [
          'Occasional crossing or wandering is normal until about three to four months as the muscles coordinate. Constant crossing, or crossing after four months, warrants a visit.',
          'A blocked tear duct (watery eye, crusting, no redness of the white of the eye) is very common and almost always clears by one year. Wipe with a warm wet cloth from the inner corner outward; the pediatrician may show you a gentle massage of the duct.',
          'Redness of the white of the eye, swelling of the lids, or thick yellow-green discharge means a call.',
          'Broken blood vessels in the whites of the eyes from delivery are common and clear in two to three weeks.',
        ],
      },
      {
        h: 'Nose',
        ul: [
          'Newborns breathe through the nose and sound snuffly, squeaky, and congested with no illness at all. Sneezing is how they clear it.',
          'Saline drops (one or two in each nostril) followed by gentle bulb suction help before feeds and sleep if congestion is interfering. Squeeze the bulb first, insert gently, release. Clean the bulb with hot soapy water. Do not suction more than a few times a day; it irritates.',
        ],
      },
      {
        h: 'Ears',
        ul: ['Clean only the outer ear with a cloth. Never put a swab in the ear canal; wax works its way out on its own.', 'Hearing was screened in the hospital. Babies startle at loud sounds and calm to familiar voices from birth.'],
      },
    ],
  },
  {
    id: 'dressing-swaddle-basics',
    group: 'care',
    title: 'Dressing and holding a newborn',
    quick: false,
    summary: 'Head and neck support, how to pick up and put down, and clothes that do not require threading a floppy head through a hole.',
    sections: [
      {
        h: 'Holding',
        ul: [
          'Always support the head and neck. Slide one hand under the head and neck and the other under the bottom to lift; bring the baby to your chest before standing up fully.',
          'Cradle hold, shoulder hold (head on your shoulder, your hand on the back of the head), and the football hold (along your forearm, head in your hand, face down or up) are the basics. Babies are sturdier than they look; a confident hold calms them.',
          'Newborns love being held and cannot be spoiled. Responding quickly in the first months builds security, not bad habits.',
        ],
      },
      {
        h: 'Dressing',
        ul: [
          'Zippers over snaps, envelope-neck shirts you can pull down over the body, and magnetic closures if you can get them. Two-way zippers for night changes.',
          'Scrunch sleeves up and reach through to pull the hand in, rather than pushing the arm through.',
          'For sleep: a sleeper or a sleep sack rated for the room temperature (TOG rating), no loose blankets.',
          'Outdoors: hat and layers in cold; a brimmed hat, shade, and lightweight cover in sun. No sunscreen before six months; keep them out of direct sun.',
        ],
      },
    ],
  },

  // ---------------------------------------------------------------- SLEEP & SOOTHING
  {
    id: 'safe-sleep',
    group: 'sleep',
    title: 'Safe sleep: the rules that prevent SIDS',
    quick: true,
    summary: 'Alone, on the Back, in a Crib or bassinet, every sleep. Nothing else in the sleep space. Room-share, do not bed-share.',
    sections: [
      {
        p: 'These AAP recommendations have cut sleep-related infant deaths dramatically. They apply to every sleep, including naps, including when you are exhausted, including at grandma’s house.',
      },
      {
        ul: [
          'On the back, every time, until the baby can roll both ways on their own. Babies who can roll may be left in the position they choose, but still start on the back.',
          'On a firm, flat surface that meets safety standards: crib, bassinet, or play yard, with only a fitted sheet. Not an adult bed, couch, armchair, car seat, swing, bouncer, lounger, or inclined sleeper. If the baby falls asleep in one of those, move them.',
          'Nothing in the sleep space: no blankets, pillows, bumpers, stuffed animals, positioners, or weighted products of any kind.',
          'In your room, close to your bed, ideally for the first six months, on their own surface. Room-sharing reduces risk; bed-sharing increases it, most of all under four months, with a preterm baby, with soft bedding, or if a parent has had alcohol, medication that causes drowsiness, or is extremely tired.',
          'Keep the room comfortable, not hot. Sleep sack or sleeper, no hat.',
          'A pacifier at sleep time reduces risk once breastfeeding is well established (usually three to four weeks). If it falls out, leave it.',
          'No smoke exposure, during pregnancy or after. Breastfeeding, any amount, reduces risk.',
          'Supervised tummy time while awake every day strengthens the neck and prevents flat spots.',
        ],
      },
      {
        h: 'The real-world dangers',
        ul: [
          'Falling asleep with the baby on a couch or armchair is the most dangerous scenario of all. If you are about to fall asleep feeding at night, feed in your bed with pillows and blankets moved away, then move the baby back when you wake. Set an alarm. Hand off to a partner when you can.',
          'Car seats are for cars. Limit continuous time, and never leave a baby sleeping in a car seat placed on the floor or a bed; the chin can drop and block the airway.',
          'Swaddling must stop at the first sign of trying to roll, often around eight weeks.',
        ],
      },
    ],
  },
  {
    id: 'swaddle',
    group: 'sleep',
    title: 'How to swaddle, and when to stop',
    quick: true,
    summary: 'Snug at the arms, loose at the hips, always on the back, stopped at the first attempt to roll.',
    sections: [
      {
        ol: [
          'Lay a thin blanket in a diamond and fold the top corner down. Place the baby on their back with shoulders just below the fold.',
          'Hold the right arm straight down (or hand near the face if the baby prefers), pull the left side of the blanket across the body, and tuck it under the back on the other side.',
          'Fold the bottom corner up over the feet, leaving room for the legs to bend up and out at the hips. Tight legs can cause hip dysplasia.',
          'Hold the left arm down, pull the right side across, and tuck it behind. Snug enough that it does not come loose, loose enough to fit two fingers between the blanket and the chest.',
        ],
      },
      {
        ul: [
          'Zip or Velcro swaddle sacks do the same job with less skill required at 3 a.m. Weighted swaddles and sleep sacks are not recommended at any age.',
          'A swaddled baby sleeps on their back only, never on the side or tummy, and never in bed with you.',
          'Do not over-layer under a swaddle; a onesie or light sleeper is usually enough.',
          'Stop swaddling at the first sign of rolling or attempting to roll, which can be as early as eight weeks and is almost always by three to four months. Transition to a sleep sack with arms out, one arm out at a time if needed.',
          'Some babies hate the swaddle. Arms-up swaddle sacks or a plain sleep sack are fine from day one.',
        ],
      },
    ],
  },
  {
    id: 'newborn-sleep',
    group: 'sleep',
    title: 'What newborn sleep actually looks like',
    quick: false,
    summary: 'Fourteen to seventeen hours a day in two- to four-hour pieces, with no idea what night is. Here is the shape of it.',
    sections: [
      {
        ul: [
          'Total: 14 to 17 hours per 24, in stretches of 30 minutes to 4 hours, spread evenly around the clock at first.',
          'Wake windows (time comfortably awake) are short: 45 to 60 minutes in the first weeks, including the feed. An overtired newborn fights sleep harder. Watch for yawning, staring, jerky movements, and fussing, and start the wind-down before crying.',
          'Day-night confusion is universal and improves by six to eight weeks. Help it along: daylight and normal noise during the day, dim lights and boring, quiet feeds at night, a short exposure to morning light.',
          'Newborn sleep is noisy: grunts, squeaks, sighs, and periodic breathing (fast breaths then a pause of up to about 10 seconds) are normal. Wait a moment before picking up a noisy baby; they are often still asleep.',
          'Until the baby has regained birth weight and the pediatrician agrees, wake to feed if a daytime stretch passes three hours or a night stretch passes four. After that, let a sleeping baby sleep.',
          'Longer stretches (5 to 6 hours) usually begin between 8 and 12 weeks, sometimes later, and often regress around four months. Night feeds are expected for most of the first six months.',
        ],
      },
      {
        tip: 'The drowsy-but-awake advice is real but not urgent. In the first six to eight weeks, do whatever gets everyone the most sleep within the safe sleep rules; habits come later.',
      },
    ],
  },
  {
    id: 'soothing',
    group: 'sleep',
    title: 'Soothing a crying newborn',
    quick: true,
    summary: 'Check the basics, then run the sequence: swaddle, side hold, shush, swing, suck. Then put the baby down and breathe.',
    sections: [
      {
        h: 'First, the checklist',
        ul: ['Hungry (when did the last feed start)?', 'Diaper?', 'Too hot, too cold, a tag or a hair wrapped around a finger or toe?', 'Needs to burp?', 'Overstimulated or overtired (it has been more than an hour awake)?', 'Just wants to be held. That is a real need.'],
      },
      {
        h: 'The 5 S’s',
        ol: [
          'Swaddle: snug, arms down.',
          'Side or stomach position in your arms: held on their side or face-down along your forearm, while awake and supervised only. Never for sleep.',
          'Shush: loud, steady “shhhh” near the ear, as loud as the crying, or a white noise machine at a safe volume (an arm’s length away, no louder than a shower).',
          'Swing: small, fast, jiggly movements with the head supported, like a shiver, not big swings. Never shake.',
          'Suck: a pacifier, a clean finger, or the breast.',
        ],
      },
      {
        h: 'Also try',
        ul: ['Skin-to-skin on a bare chest.', 'A walk outside or a drive.', 'A warm bath.', 'A change of holder; babies can smell milk on the nursing parent and fuss for it.', 'Reducing stimulation: dim room, quiet, slow movements.'],
      },
      {
        warn: 'If nothing works and you feel rage or despair rising, put the baby down on their back in the crib, close the door, and step away for ten minutes. A crying baby in a safe crib is fine; a shaken baby is not. Call a partner, a friend, or a help line. This is the single most important paragraph in this guide.',
      },
    ],
  },
  {
    id: 'purple-crying',
    group: 'sleep',
    title: 'The crying peak (PURPLE crying) and colic',
    quick: false,
    summary: 'Crying increases from two weeks, peaks around six to eight weeks, and fades by three to four months. Knowing the curve makes it survivable.',
    sections: [
      {
        p: 'Healthy babies cry more in the second month than at any other time, often for hours in the late afternoon and evening, sometimes inconsolably, with a pain-like face and no identifiable cause. The Period of PURPLE Crying is the name given to this normal phase: Peak at about two months, Unexpected, Resists soothing, Pain-like face, Long-lasting, Evening. Colic is the traditional label when it exceeds about three hours a day, three days a week, for three weeks; it is the far end of the same curve, not a disease.',
      },
      {
        ul: [
          'It is not your fault and not a sign of a feeding problem if the baby is gaining and has normal diapers.',
          'Plan for it: evening shifts, a walk at 5 p.m., the baby carrier, white noise, dinner prepped early. Reduce evening stimulation.',
          'Take turns. Twenty minutes away from the sound resets a nervous system.',
          'Never shake a baby, not even once, not even briefly. Shaking causes brain injury and death. Put the baby down safely and walk away before you reach that point.',
          'Reflux medication, formula changes, and gas drops rarely change this pattern; discuss with the pediatrician before chasing them.',
        ],
      },
      {
        h: 'Call the pediatrician if',
        ul: ['Crying comes with fever, vomiting, fewer wet diapers, a bulging soft spot, or a high-pitched cry unlike usual.', 'The baby seems in pain when moved, or has a swollen belly.', 'Crying is constant beyond four months, or you simply want reassurance. That is a valid reason.'],
      },
    ],
  },

  // ---------------------------------------------------------------- HEALTH & SAFETY
  {
    id: 'when-to-call',
    group: 'health',
    title: 'When to call the pediatrician or go to the ER',
    quick: true,
    summary: 'The short list for the first three months. When in doubt, call; newborn lines exist for exactly this.',
    sections: [
      {
        h: 'Go to the emergency department or call 911',
        ul: [
          'Rectal temperature of 100.4 °F (38 °C) or higher under three months of age.',
          'Trouble breathing: more than 60 breaths a minute at rest, grunting with each breath, flaring nostrils, the skin pulling in between the ribs or at the neck, pauses longer than 20 seconds, or blue or gray lips, tongue, or face.',
          'Unresponsive, limp, very hard to wake, or a seizure.',
          'A fall onto the head, or any injury with vomiting, unusual sleepiness, or a bulging soft spot.',
          'Blood in vomit or large amounts in stool.',
        ],
      },
      {
        h: 'Call the pediatrician today (use the after-hours line at night)',
        ul: [
          'Refusing two feeds in a row, or feeding much less than usual.',
          'Fewer wet diapers than expected, a dry mouth, no tears, or a sunken soft spot.',
          'Jaundice spreading to the belly or legs, or a baby too sleepy to feed.',
          'Temperature below 97.7 °F (36.5 °C) that does not come up with skin-to-skin.',
          'Projectile or green vomiting, or a swollen hard belly.',
          'Redness spreading around the cord, circumcision, or any wound; pus; a rash with fever or blisters.',
          'White or pale stools, red stools, or black stools after the first week.',
          'Eye discharge with redness or swelling.',
          'Inconsolable crying for more than two hours that is different from the baby’s usual pattern, or a high-pitched or weak cry.',
          'Anything that worries you. Pediatric offices expect and want these calls in the first weeks.',
        ],
      },
      {
        tip: 'Before you call, have ready: the baby’s age in days, temperature and how it was taken, feeds and diapers in the last 24 hours (Bloom’s Day view), and the one symptom that made you pick up the phone.',
      },
    ],
  },
  {
    id: 'jaundice',
    group: 'health',
    title: 'Jaundice',
    quick: true,
    summary: 'Yellow skin that appears on day two or three and peaks around day three to five. Usually normal; sometimes needs light treatment. Feeding is the medicine.',
    sections: [
      {
        p: 'Newborns break down extra red blood cells and their livers are slow to clear the yellow pigment (bilirubin). About 60 percent of term babies and most preterm babies look visibly yellow in the first week. Bilirubin is checked before discharge and usually again at the first visit, because the level, not the look, determines what to do.',
      },
      {
        ul: [
          'It appears first in the face and whites of the eyes and moves downward as levels rise. Yellow on the belly, legs, or palms means higher levels and a same-day call.',
          'Check in natural daylight; press gently on the skin and look at the color underneath.',
          'Frequent feeding, 8 to 12 times a day, is the main treatment: bilirubin leaves through stool. Sleepy, jaundiced babies need to be woken to feed, and the two problems feed each other.',
          'Treatment, if needed, is phototherapy: blue lights in the hospital or sometimes a home blanket, usually for a day or two. It is painless and effective.',
          'Breast milk jaundice, a mild yellow that lingers two to three months in a thriving breastfed baby, is harmless and does not require stopping breastfeeding.',
        ],
      },
      {
        warn: 'Call the pediatrician right away if yellow appears in the first 24 hours of life, spreads below the belly button, if the baby is very sleepy or hard to wake, feeding poorly, arching, or has a high-pitched cry, dark urine, or pale, chalky stools. Very high levels can harm the brain, and they are entirely preventable with timely treatment.',
      },
    ],
  },
  {
    id: 'checkups-weight',
    group: 'health',
    title: 'Checkups, weight checks, and the first visit',
    quick: false,
    summary: 'First visit within a few days of discharge, then a predictable schedule. What they measure and what the numbers mean.',
    sections: [
      {
        ul: [
          'First visit: usually 2 to 3 days after leaving the hospital (by about day 5 of life), for weight, jaundice, feeding, and cord check. Bring your log of feeds and diapers.',
          'Then roughly at 2 weeks, 1 month, 2 months, 4 months, 6 months, 9 months, and 12 months, with vaccines at most of them.',
          'Weight: most babies lose 5 to 10 percent of birth weight in the first days and regain it by 10 to 14 days. A loss over 10 percent, or not regaining by two weeks, prompts a feeding plan and closer follow-up.',
          'After that, about 5 to 7 ounces (150 to 200 g) a week for the first three months, doubling birth weight by around four to five months and tripling by a year. Length and head circumference are tracked too.',
          'Percentiles describe where your baby sits relative to others; the trend along their own curve matters more than the number. A 10th percentile baby following the 10th percentile line is growing well.',
          'Home scales are not accurate enough for newborn decisions. If weight is a concern, the office or a lactation consultant can do weighed feeds (weigh before and after a feed).',
        ],
      },
      {
        tip: 'Log the hospital’s birth weight and discharge weight in Bloom’s Growth tab with their dates; Bloom shows the change since birth so you can see the regain.',
      },
    ],
  },
  {
    id: 'vaccines',
    group: 'health',
    title: 'Vaccines and protecting a newborn from illness',
    quick: false,
    summary: 'The baby’s first shots, the adults’ shots, and RSV protection.',
    sections: [
      {
        h: 'For the baby',
        ul: [
          'Hepatitis B: first dose within 24 hours of birth, then at 1 to 2 months and 6 to 18 months.',
          'Two months: DTaP (whooping cough, tetanus, diphtheria), polio, Hib, pneumococcal, rotavirus (oral), and hepatitis B. These are the first real protection against whooping cough, which is most dangerous in the first months.',
          'RSV: a long-acting antibody injection (nirsevimab or clesrovimab) is recommended for babies under 8 months entering their first RSV season, unless the mother received the maternal RSV vaccine at 32 to 36 weeks of pregnancy at least two weeks before delivery.',
          'Expect fussiness and a low-grade temperature for a day after shots. For a baby under three months, any fever over 100.4 °F still deserves a call, even after vaccines.',
        ],
      },
      {
        h: 'For the adults (“cocooning”)',
        ul: [
          'Everyone who will hold the baby regularly should be current on Tdap (whooping cough), the annual flu vaccine, and COVID-19 vaccination, ideally two weeks before meeting the baby.',
          'The mother should have received Tdap during this pregnancy; if not, it is given right after birth.',
        ],
      },
      {
        h: 'Visitors in the first two months',
        ul: [
          'Wash hands before touching the baby; hand sanitizer at the door.',
          'No kissing the baby’s face or hands. Anyone with a cold sore stays away entirely; herpes is life-threatening to newborns.',
          'Anyone sick, recently sick, or living with someone sick waits.',
          'Smokers wash and change before holding the baby.',
          'Keep visits short and useful: visitors who bring food and do dishes are welcome; visitors who need hosting are not. Crowds, stores, and daycare pickups are best minimized until after the two-month vaccines, especially during fall and winter virus season.',
        ],
      },
    ],
  },
  {
    id: 'medicines',
    group: 'health',
    title: 'Medicines and what not to give',
    quick: false,
    summary: 'Under three months, nothing goes in without the pediatrician’s okay. The short list of never.',
    sections: [
      {
        ul: [
          'No fever or pain medicine (acetaminophen, ibuprofen) under three months unless a provider has told you to, and no ibuprofen at all under six months. Fever in a newborn is a reason to be seen, not treated at home.',
          'No cough or cold medicines, no honey (botulism) before one year, no herbal remedies, teething gels, or essential oils.',
          'No water, juice, or cereal in the bottle in the first months.',
          'No aspirin for children at any age.',
          'Vitamin D drops as recommended by the pediatrician for breastfed babies are the exception, along with anything prescribed.',
          'Saline drops and a bulb syringe are safe for congestion. A cool-mist humidifier is fine; clean it daily.',
          'When a medicine is prescribed, use the syringe that comes with it, aim at the inside of the cheek, and give slowly. Write down doses and times; sleep-deprived double-dosing is a real thing.',
        ],
      },
      {
        tip: 'For the breastfeeding parent, most common medications are compatible with nursing; check the LactMed database (free, from the National Library of Medicine) or ask a pharmacist rather than assuming you must stop.',
      },
    ],
  },
  {
    id: 'car-seat',
    group: 'health',
    title: 'Car seat safety',
    quick: false,
    summary: 'Rear-facing, back seat, harness snug, no coats. The one piece of baby gear where the details matter most.',
    sections: [
      {
        ul: [
          'Rear-facing in the back seat, as long as possible, until the seat’s rear-facing limits are reached (usually well past age two). Never in front of an active airbag.',
          'Install tightly: the seat should not move more than an inch side to side at the belt path. Use either the lower anchors or the seat belt, not both unless the manual allows. Get it checked by a certified technician.',
          'Recline angle matters for a newborn’s airway; use the seat’s indicator.',
          'Harness: straps at or below the shoulders when rear-facing, chest clip at armpit level, snug enough that you cannot pinch a fold of webbing at the collarbone.',
          'No bulky coats or snowsuits under the harness; dress in thin layers and put a blanket or the coat over the harness. No aftermarket inserts, strap covers, or head positioners that did not come with the seat.',
          'Limit continuous time in the seat to about two hours and never let the baby sleep in a car seat outside the car. A newborn’s head can slump and obstruct breathing.',
          'Check the expiration date, and do not use a seat that has been in a moderate or severe crash or whose history you do not know.',
        ],
      },
    ],
  },

  // ---------------------------------------------------------------- GROWING & DEVELOPING
  {
    id: 'first-weeks-dev',
    group: 'growing',
    title: 'What your newborn can do',
    quick: false,
    summary: 'Reflexes, senses, and the first learning. More is happening than it looks like.',
    sections: [
      {
        h: 'Reflexes (present at birth, fading over months)',
        ul: [
          'Rooting: turns toward a touch on the cheek. Sucking. Swallowing.',
          'Moro (startle): arms fling out and back when startled or when the head drops. This is why swaddling helps sleep. Fades by four to six months.',
          'Grasp: curls fingers around anything placed in the palm. Stepping: makes walking motions when held upright on a surface.',
          'Tonic neck (fencing): head turned to one side, that arm extends. Fades around four months.',
        ],
      },
      {
        h: 'Senses',
        ul: [
          'Vision: focuses best at 8 to 12 inches, exactly the distance to your face while feeding. Prefers faces, high contrast, and movement. Color vision is immature; red is seen earliest, and full color vision develops over the first four to five months. Eyes may wander or cross until the muscles coordinate around three months.',
          'Hearing: fully functional at birth; recognizes your voices from the womb and calms to them. Prefers higher-pitched, sing-song speech.',
          'Smell and taste: recognizes the smell of your milk and skin within days; prefers sweet.',
          'Touch: the most developed sense. Skin-to-skin regulates temperature, heart rate, breathing, and stress for both of you.',
        ],
      },
      {
        h: 'What to do in the first month',
        ul: [
          'Talk, sing, and narrate. Face to face, close, with pauses as if in conversation. Language exposure starts now.',
          'Tummy time from the first days: a few minutes, several times a day, on your chest or a firm surface, always awake and supervised. Build toward 15 to 30 minutes total a day by about seven weeks.',
          'High-contrast cards or a black-and-white board book at 8 to 12 inches; move it slowly side to side.',
          'Respond to cries; you cannot spoil a newborn. Responsive care is the foundation of attachment and self-regulation.',
          'Reading aloud from birth is recommended by the AAP; the baby hears the rhythm and your voice, and the habit is the point.',
        ],
      },
    ],
  },
  {
    id: 'milestones-early',
    group: 'growing',
    title: 'The first three months, month by month',
    quick: false,
    summary: 'What to expect and roughly when. Ranges are wide; the pediatrician tracks the trend.',
    sections: [
      {
        h: 'By about one month',
        ul: ['Lifts head briefly during tummy time; turns it side to side.', 'Brings hands near face; keeps fists clenched.', 'Focuses on faces and objects 8 to 12 inches away; may briefly follow movement.', 'Startles at sounds; calms to a familiar voice.', 'Begins to make sounds other than crying.'],
      },
      {
        h: 'By about two months',
        ul: ['Social smile in response to you, usually between six and eight weeks. One of the great days.', 'Coos and makes vowel sounds; turns toward sounds.', 'Holds head up and begins to push up on arms during tummy time.', 'Smoother movements; hands opening more; may briefly hold an object.', 'Follows objects and faces with the eyes past the midline.', 'Longer awake periods; crying peaks around now.'],
      },
      {
        h: 'By about three months',
        ul: ['Good head control when held upright; pushes up on forearms with chest off the floor.', 'Bats at toys; brings hands together and to the mouth; grasps and shakes.', 'Laughs, squeals, babbles back and forth with you; recognizes you from across a room.', 'Tracks smoothly, including moving objects; eye crossing should be settling.', 'Longer night sleep stretches for many babies; more predictable rhythms.'],
      },
      {
        h: 'Mention to the pediatrician',
        ul: ['Not responding to loud sounds, or not calming to your voice.', 'Not following objects with the eyes by two to three months, or constant eye crossing after three to four months.', 'Not smiling at people by two to three months.', 'Very stiff or very floppy, or not bringing hands to the mouth by three months.', 'Not holding the head up at all during tummy time by three months.'],
      },
      {
        tip: 'The CDC’s milestone checklists (the “Learn the Signs. Act Early.” program) list what most babies do by each age. Premature babies are tracked by adjusted age (from the due date) for the first two years.',
      },
    ],
  },
  {
    id: 'eye-color',
    group: 'growing',
    title: 'Eye color, hair, and other things that change',
    quick: false,
    summary: 'Why newborn eyes are often gray-blue, when they settle, and what else will look different in a year.',
    sections: [
      {
        ul: [
          'Eye color depends on melanin in the iris, which is produced in response to light after birth. Many babies with European ancestry are born with gray-blue eyes that darken over months; babies with African, Asian, or Hispanic ancestry are more often born with brown eyes that deepen.',
          'Most of the change happens by six to nine months, and color is usually settled by the first birthday, though subtle shifts can continue to age three. Two blue-eyed parents usually, but not always, have blue-eyed children; genetics here is more complicated than the textbook chart.',
          'Hair: newborn hair often falls out in the first months, sometimes in a pattern (the bald patch at the back is from rubbing on the mattress), and grows back in a different color or texture. Dark-haired newborns can become blond toddlers.',
          'Head shape rounds out from birth molding within weeks. Flat spots from back sleeping are prevented with tummy time and alternating the head direction in the crib; mention a persistent flat spot at a visit.',
          'The soft spots (fontanelles) are normal and safe to touch and wash. The back one closes by about two months, the front one between 9 and 18 months. A sunken spot can mean dehydration; a bulging spot while calm and upright needs a call.',
          'Birthmarks: stork bites and angel kisses fade; hemangiomas (strawberry marks) often appear in the first weeks, grow, and then shrink over years; mention any new or growing mark at a visit.',
        ],
      },
    ],
  },
  {
    id: 'gut-microbiome',
    group: 'growing',
    title: 'The newborn gut',
    quick: false,
    summary: 'Why the first poops change color every day, and what builds a healthy gut in the first months.',
    sections: [
      {
        p: 'A baby is born with an almost sterile gut and acquires bacteria from the birth canal (or, after a cesarean, more from skin and the environment), from skin-to-skin, and above all from milk. Breast milk contains sugars the baby cannot digest at all; they exist to feed specific beneficial bacteria. The differences between vaginal and cesarean, and breastfed and formula-fed, microbiomes narrow substantially by six to twelve months, especially once solids begin.',
      },
      {
        ul: [
          'The stool progression from black meconium to green transitional to yellow reflects milk arriving and the microbiome establishing. Yellow, seedy, sweet-smelling stools are the signature of a breastfed gut.',
          'Things that help: skin-to-skin, breastfeeding when possible, avoiding unnecessary antibiotics (while taking necessary ones without hesitation), a dog in the house (associated with fewer allergies), and later, a varied diet.',
          'Probiotic drops are marketed heavily; evidence for routine use in healthy term babies is limited. Discuss with the pediatrician before using any.',
          'Gassiness, grunting, and straining with red faces while passing soft stool are normal in the first months (the baby is learning to coordinate), not constipation. Constipation is hard, pellet-like stool.',
          'Formula-fed babies have firmer, browner, smellier stools; that is also normal.',
        ],
      },
    ],
  },

  // ---------------------------------------------------------------- MOM'S RECOVERY
  {
    id: 'mom-warning-signs',
    group: 'mom',
    title: 'Postpartum warning signs (for six weeks)',
    quick: true,
    summary: 'The list every partner should also know. Preeclampsia, bleeding, clots, infection, and mental health emergencies all happen after discharge.',
    sections: [
      {
        h: 'Call 911',
        ul: ['Chest pain, trouble breathing, or coughing up blood.', 'A seizure.', 'Thoughts of harming yourself or the baby.', 'Bleeding that soaks more than one pad an hour or makes you faint or dizzy.'],
      },
      {
        h: 'Call your provider today',
        ul: [
          'Severe headache that does not improve with rest and acetaminophen, or any headache with vision changes, swelling of the face or hands, or pain under the right ribs. These are postpartum preeclampsia signs and can appear up to six weeks after birth.',
          'Blood pressure 140/90 or higher if you have a cuff.',
          'Fever of 100.4 °F (38 °C) or higher.',
          'A red, swollen, painful calf or thigh.',
          'Bleeding that soaks a pad in an hour, clots larger than an egg, or bleeding that turns bright red again after it had lightened.',
          'Incision or tear that is red, swollen, opening, or draining; foul-smelling discharge; pain or burning with urination.',
          'A hot, red, painful breast area with fever or flu-like symptoms.',
          'Feeling hopeless, panicked, unable to sleep when the baby sleeps, disconnected from the baby, or not yourself, especially beyond two weeks.',
        ],
      },
      {
        p: 'Begin every call with “I gave birth [X] days ago.” Resources: Postpartum Support International 1-800-944-4773 (call or text “HELP”), National Maternal Mental Health Hotline 1-833-852-6262, 988 for crisis.',
      },
    ],
  },
  {
    id: 'mom-recovery-home',
    group: 'mom',
    title: 'Recovery at home, week by week',
    quick: false,
    summary: 'What the first six weeks feel like physically, and what helps.',
    sections: [
      {
        h: 'Week one',
        ul: [
          'Bleeding like a heavy period, cramping (worse while nursing), a sore perineum or incision, swollen feet, night sweats, exhaustion, and tears on day three to five when hormones drop and milk comes in.',
          'Peri bottle every bathroom trip, ice then sitz baths, witch hazel pads, stool softener as advised, lots of water, protein, and fiber. Lie down as much as you sit; sitting puts pressure on everything that hurts.',
          'Cesarean: walk short distances often, hold a pillow against the incision to cough or laugh, keep it clean and dry, no lifting more than the baby.',
          'The rule for the first two weeks: in bed or on the couch, feeding the baby and sleeping. Let everyone else do everything else.',
        ],
      },
      {
        h: 'Weeks two to four',
        ul: [
          'Bleeding lightens and browns. Energy returns in patches. Short walks are good; a sudden increase in bleeding means you overdid it.',
          'Baby blues should be fading by two weeks. If not, see mental health topics.',
          'Hemorrhoids, constipation, and leaking urine are common and improve. Gentle pelvic floor contractions can start when they do not hurt.',
          'Hair, skin, and belly look different. The uterus is back to pre-pregnancy size by about six weeks; the belly takes much longer and some things do not return to exactly the same; that is normal.',
        ],
      },
      {
        h: 'Six weeks and beyond',
        ul: [
          'The postpartum visit (ACOG now recommends contact within three weeks and a full visit by twelve) covers healing, mood, contraception, and any pregnancy complications like blood pressure or gestational diabetes that need follow-up.',
          'Ask for a pelvic floor physical therapy referral if you have leaking, pain, heaviness, or pain with sex. It is standard care in many countries and underused in the US.',
          'Hair shedding peaks around three to four months. Joints stay loose for months after birth, especially while breastfeeding; ease back into exercise.',
        ],
      },
    ],
  },
  {
    id: 'mental-health',
    group: 'mom',
    title: 'Mental health: both parents',
    quick: false,
    summary: 'One in seven mothers and one in ten fathers. Treatable, common, and nothing to tough out.',
    sections: [
      {
        ul: [
          'Baby blues (tearful, overwhelmed, moody) peak around day three to five and resolve within two weeks. Beyond that, or more severe at any point, think depression or anxiety and say so to a provider.',
          'Postpartum depression: persistent sadness, emptiness, guilt, hopelessness, loss of interest, trouble bonding, changes in appetite and sleep beyond what the baby causes, thoughts of death.',
          'Postpartum anxiety (at least as common): constant worry, racing thoughts, dread, physical symptoms (racing heart, nausea), inability to sleep even when the baby sleeps, checking the baby obsessively, intrusive images of harm. Intrusive thoughts are symptoms, not desires, and telling someone brings relief.',
          'Postpartum rage and irritability are under-recognized presentations of both.',
          'Partners: notice, ask directly, take the baby so she can sleep a four-hour stretch, come to the appointment. Watch yourself too; paternal depression peaks at three to six months.',
          'Treatment works and most options are compatible with breastfeeding: therapy, peer support groups, medication, and a sleep plan. The OB, midwife, family doctor, or even the pediatrician can start it; pediatricians screen mothers at well visits for exactly this reason.',
        ],
      },
      {
        warn: 'Postpartum psychosis is rare and an emergency: confusion, hallucinations, paranoia, not sleeping for days, rapid mood swings, or beliefs out of touch with reality, usually within two weeks of birth. Do not leave her alone; call 911 or go to the emergency department.',
      },
    ],
  },

  // ---------------------------------------------------------------- HOME & LOGISTICS
  {
    id: 'first-nights',
    group: 'home',
    title: 'The first nights home',
    quick: true,
    summary: 'A system for two exhausted people and one baby who thinks night is day.',
    sections: [
      {
        h: 'Before dark',
        ul: [
          'Set up a night station by the bed: diapers, wipes, a change of sleeper, burp cloths, water, snacks, a dim red or amber light, phone charger.',
          'Bassinet beside the bed, on the nursing parent’s side if breastfeeding.',
          'Agree on the plan while you are both awake. Who gets up for what, and when the shift changes.',
        ],
      },
      {
        h: 'Shift systems that work',
        ul: [
          'Breastfeeding: she feeds, hands off; partner changes, burps, settles, and puts the baby down, then she sleeps immediately instead of staying up for the settling. Partner does all non-feeding tasks until a set hour.',
          'Split night: one parent on duty 9 p.m. to 2 a.m. with pumped milk or formula, the other 2 a.m. to 7 a.m., each getting one real block of sleep. Many families start this at a few weeks once a bottle is introduced.',
          'Whatever the plan, protect one four- to five-hour block of sleep for the birthing parent most nights. It is medicine for mood, milk, and recovery.',
        ],
      },
      {
        h: 'Expectations',
        ul: [
          'Night two and three at home often repeat the second night: constant feeding and refusing the bassinet. Skin-to-skin, swaddle, white noise, and taking turns.',
          'Newborns need to be fed every two to three hours around the clock for now. This is a phase measured in weeks.',
          'Nobody is sleeping well. Keep the bar low: fed, safe, roughly clean. Everything else is optional.',
          'If you are about to fall asleep holding the baby, put them in the bassinet first, even if they cry. Falling asleep on a couch or chair with the baby is the risk to avoid at all costs.',
        ],
      },
    ],
  },
  {
    id: 'partner-at-home',
    group: 'home',
    title: 'Partner: the first two weeks at home',
    quick: true,
    summary: 'Your job description changed. Here it is.',
    sections: [
      {
        ul: [
          'Own everything that is not feeding: diapers, burping, baths, laundry, dishes, meals, pets, the door, the phone, the thank-you texts.',
          'Protect her rest and her recovery. Enforce the first two weeks of lying down. Bring water and food every time she sits down to feed; breastfeeding burns around 500 calories a day and thirst hits hard.',
          'Learn the baby yourself. Take the baby for a walk, do the bath, do the night settles. Confidence comes from reps, and it makes you a true second parent rather than an assistant.',
          'Gatekeep visitors. Short, useful visits only; you are the one who says “she is resting” and “we will let you know when we are ready.”',
          'Watch her for the warning signs: bleeding, headache, fever, calf pain, and mood. You will notice before she admits it. Ask directly how she is sleeping and feeling.',
          'Watch yourself. Eat, shower, step outside daily, sleep in shifts. Paternal depression is real and peaks a few months in.',
          'Handle the admin: insurance enrollment within 30 days, the pediatrician visit scheduling, leave paperwork, birth certificate follow-up.',
          'Say out loud that she is doing well. She is not sure, and she cannot hear it too often.',
        ],
      },
    ],
  },
  {
    id: 'admin',
    group: 'home',
    title: 'Paperwork and deadlines',
    quick: false,
    summary: 'The administrative traps, with their deadlines.',
    sections: [
      {
        ul: [
          'Health insurance: add the baby within 30 days of birth (60 for some marketplace plans). A birth is a qualifying life event, and coverage is retroactive to birth only if you enroll on time. Call HR or the insurer from the hospital if you can.',
          'Birth certificate and Social Security number: the forms are completed in the hospital. The SSN card arrives by mail in a few weeks; the birth certificate is ordered from the county or state, often with a small fee. You will need both for insurance, taxes, and passports.',
          'Pediatrician: chosen before birth, with the first visit booked for two to three days after discharge. The hospital will ask for the name.',
          'Parental leave: employer forms and any state paid-leave claims often have deadlines in the first weeks; do them early.',
          'Taxes: the baby is a dependent for the whole year regardless of birth date; update withholding if you want.',
          'Will and guardianship: a simple will naming a guardian is a one-afternoon task that most new parents postpone for years.',
          'Life insurance and beneficiaries: review both parents’ policies and update beneficiaries on retirement accounts.',
          'Car seat registration (for recall notices) and the product registration cards for the crib and other gear.',
        ],
      },
    ],
  },
  {
    id: 'supplies',
    group: 'home',
    title: 'What you actually need at home',
    quick: false,
    summary: 'The short list, and the things that can wait until you know you want them.',
    sections: [
      {
        h: 'Day one',
        ul: [
          'A safe sleep space (bassinet, crib, or play yard with a firm flat mattress and fitted sheets).',
          'Diapers in newborn and size 1, wipes, barrier cream, a changing pad, a diaper pail or a lidded can.',
          'Six to eight sleepers or gowns, a few onesies, two or three swaddles or sleep sacks, socks, a hat for outdoors.',
          'Burp cloths (a dozen), a nursing pillow, nipple cream, breast pads, and bottles with slow-flow nipples even if breastfeeding.',
          'Formula and a bottle brush if formula feeding; a method to sanitize.',
          'A digital rectal thermometer, nail file, bulb syringe (the hospital one), saline drops, a soft hairbrush.',
          'For her: heavy pads, peri bottle, witch hazel pads, comfortable high-waisted underwear, a water bottle with a straw, stool softener as advised, easy snacks.',
          'The installed car seat, and a carrier or wrap for hands-free soothing.',
        ],
      },
      {
        h: 'Can wait',
        ul: ['A stroller beyond the car-seat frame, a high chair, toys, shoes, most gadgets, a wipe warmer, a bottle warmer (a mug of warm water works), and most of the registry.'],
      },
      {
        h: 'Skip',
        ul: ['Crib bumpers, pillows, positioners, inclined sleepers, weighted sleep products, and anything marketed as making bed-sharing safe.'],
      },
    ],
  },
  {
    id: 'pets-outings',
    group: 'home',
    title: 'Pets, outings, and the first trips out',
    quick: false,
    summary: 'Introducing the dog, when to go out, and the diaper bag that actually works.',
    sections: [
      {
        h: 'Pets',
        ul: [
          'Bring home a blanket or hat with the baby’s smell before the baby, if you can.',
          'Greet the pet without the baby first, then introduce calmly with the pet leashed or held. Reward calm behavior.',
          'Never leave a pet alone with a baby, however gentle. Keep cats out of the sleep space (a closed door or a crib tent).',
          'Keep the pet’s routine as normal as possible; the dog is also adjusting.',
        ],
      },
      {
        h: 'Going out',
        ul: [
          'Fresh air walks from the first week are good for everyone. Avoid crowds and indoor public spaces as much as practical until after the two-month vaccines, and especially during respiratory virus season.',
          'In the carrier: face visible, chin off the chest, close enough to kiss. In the stroller: shaded, dressed for the weather.',
          'Feeding in public is legal everywhere in the US and gets easier with a loose top or a cover you like.',
        ],
      },
      {
        h: 'The diaper bag',
        ul: ['Four diapers, a travel pack of wipes, a changing pad, a bag for dirties.', 'One full change of baby clothes and a spare top for you.', 'Two burp cloths, a swaddle, a hat.', 'Feeding supplies: a bottle and pre-measured formula or expressed milk in a cooler, or nursing pads and cover.', 'Hand sanitizer, snacks and water for you, a pacifier, a phone charger.'],
      },
    ],
  },
];
