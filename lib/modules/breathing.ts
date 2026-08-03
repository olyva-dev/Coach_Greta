import type { Module } from "@/lib/modules/types";

// Paced breathing. Box breathing and the 4-7-8 pattern are both widely
// published relaxation techniques; the mechanism they share is a longer
// exhale than inhale, which raises vagal tone and slows the heart rate.
export const breathingModule: Module = {
  key: "breathing",
  name: "Breathing exercise",
  emoji: "🫁",
  summary:
    "Paced breathing with an exhale longer than the inhale, which slows the heart rate and settles the nervous system. Useful mid afternoon or before sleep.",

  howTo: [
    {
      title: "Sit or lie somewhere steady",
      body: "Upright in a chair with both feet down, or lying on your back. Let the shoulders drop.",
    },
    {
      title: "Breathe into the belly, not the chest",
      body: "Put a hand on your stomach. It should rise on the inhale and fall on the exhale. If only your chest moves, the breath is too shallow.",
    },
    {
      title: "Follow the ring",
      body: "Inhale while it fills, hold while it holds, exhale while it empties. Do not force the count, ease into it.",
    },
    {
      title: "Breathe through the nose",
      body: "In through the nose. Out through the nose or gently through pursed lips, whichever is more comfortable.",
    },
  ],

  cautions: [
    "Never force a breath hold. If you feel short of breath, drop the hold and just breathe in and out evenly.",
    "Light dizziness means you are breathing too deeply or too fast. Stop, breathe normally, and start again with shorter counts.",
    "If you have a heart or respiratory condition, or you are pregnant, check with a doctor before doing paced breathing regularly.",
    "Stop if you feel unwell at any point. This should feel calming, never like effort.",
  ],

  sources: [],

  defaultLevelKey: "box",

  levels: [
    {
      key: "calm",
      name: "Simple calming",
      description:
        "Four in, six out, no holds. The easiest entry point and the safest if breath holds feel uncomfortable.",
      repPhases: [
        { kind: "contract", seconds: 4, label: "Breathe in", cue: "Through the nose, into the belly" },
        { kind: "relax", seconds: 6, label: "Breathe out", cue: "Slow and steady, longer than the inhale" },
      ],
      repsPerSet: 10,
      sets: 1,
      restBetweenSets: 0,
      timesPerDay: "any time you need to settle",
    },
    {
      key: "box",
      name: "Box breathing",
      description:
        "Four seconds each for in, hold, out, hold. An even square, widely used for focus and stress control.",
      repPhases: [
        { kind: "contract", seconds: 4, label: "Breathe in", cue: "Into the belly" },
        { kind: "hold", seconds: 4, label: "Hold", cue: "Stay relaxed, do not strain" },
        { kind: "relax", seconds: 4, label: "Breathe out", cue: "Slow release" },
        { kind: "hold", seconds: 4, label: "Hold", cue: "Empty and still" },
      ],
      repsPerSet: 8,
      sets: 1,
      restBetweenSets: 0,
      timesPerDay: "once or twice a day",
    },
    {
      key: "four-seven-eight",
      name: "4-7-8",
      description:
        "Four in, seven hold, eight out. The longest exhale of the three, best used before sleep. Skip it if the seven second hold feels like a strain.",
      repPhases: [
        { kind: "contract", seconds: 4, label: "Breathe in", cue: "Quietly through the nose" },
        { kind: "hold", seconds: 7, label: "Hold", cue: "Relaxed, no tension in the throat" },
        { kind: "relax", seconds: 8, label: "Breathe out", cue: "Long and complete" },
      ],
      repsPerSet: 4,
      sets: 1,
      restBetweenSets: 0,
      timesPerDay: "before sleep",
    },
  ],
};
