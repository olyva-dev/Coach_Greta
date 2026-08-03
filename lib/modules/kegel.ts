import type { Module } from "@/lib/modules/types";

// Protocol follows the published guidance from Mayo Clinic and Memorial
// Sloan Kettering, which agree on the shape and differ only in progression:
//   Mayo:  squeeze 3s, relax 3s, aim for 4 sets of 10 (40 a day)
//   MSKCC: start holding 5s, work up to 10s; quick sets are 2s on / 2s off,
//          long sets 10s on / 10s off; 10 quick then 10 long, 3 to 5 times
//          a day
// Levels below encode that progression. Nothing here is user editable at
// runtime on purpose: it is medical content, versioned with the app.
export const kegelModule: Module = {
  key: "kegel",
  name: "Kegel exercises",
  emoji: "🧘",
  summary:
    "Trains the pelvic floor muscles that support the bladder and bowel. Done consistently, it improves bladder control and helps with continence recovery.",

  howTo: [
    {
      title: "Find the right muscles",
      body: "Tighten the muscles you would use to stop yourself from passing gas, or to stop the flow of urine midstream. You should feel a lift and a tightening around the base of the penis and the anus. That squeeze is the movement, nothing else needs to move.",
    },
    {
      title: "Empty your bladder first",
      body: "Go to the toilet before you start. A full bladder makes the contraction harder to feel and harder to hold.",
    },
    {
      title: "Pick a position",
      body: "Lying down is easiest when you are starting out, because gravity is not working against you. As it gets easier, do them sitting, then standing. Standing is the hardest and the most useful day to day.",
    },
    {
      title: "Squeeze, then fully release",
      body: "Follow the timer: squeeze while it says contract, then let go completely while it says relax. The release matters as much as the squeeze, a muscle that never fully relaxes does not get stronger.",
    },
    {
      title: "Keep breathing",
      body: "Breathe normally the whole time. If you find yourself holding your breath, you are pushing rather than lifting.",
    },
  ],

  cautions: [
    "Do not clench your stomach, thighs or buttocks. If those are moving, they are doing the work instead of the pelvic floor.",
    "Do not hold your breath. Breathe normally through every contraction.",
    "Do not practise by stopping your urine flow. It is fine as a one time way to locate the muscles, but doing it regularly can leave the bladder incompletely emptied and raise the risk of infection.",
    "Do not push down or bear down. The movement is a lift inward and upward, never a strain outward.",
    "Expect weeks to months, not days. Improvement is gradual with daily practice.",
    "Stop and speak to a doctor if you get pain, or if symptoms get worse rather than better.",
  ],

  sources: [
    {
      label: "Mayo Clinic, Kegel exercises for men",
      url: "https://www.mayoclinic.org/es/healthy-lifestyle/mens-health/in-depth/kegel-exercises-for-men/art-20045074",
    },
    {
      label: "Memorial Sloan Kettering, Pelvic floor (Kegel) exercises for males",
      url: "https://www.mskcc.org/es/cancer-care/patient-education/pelvic-floor-muscle-kegel-exercises-males",
    },
  ],

  defaultLevelKey: "starter",

  levels: [
    {
      key: "starter",
      name: "Starter",
      description:
        "Mayo Clinic's starting point: three seconds on, three seconds off. Begin here, lying down, until the movement feels isolated and easy.",
      repPhases: [
        {
          kind: "contract",
          seconds: 3,
          label: "Squeeze",
          cue: "Lift in and up, keep breathing",
        },
        {
          kind: "relax",
          seconds: 3,
          label: "Release",
          cue: "Let go completely",
        },
      ],
      repsPerSet: 10,
      sets: 1,
      restBetweenSets: 0,
      timesPerDay: "4 sets across the day, 40 in total",
    },
    {
      key: "building",
      name: "Building",
      description:
        "Five seconds on, five seconds off. Move here once three seconds feels comfortable and you can keep the stomach, thighs and buttocks still.",
      repPhases: [
        {
          kind: "contract",
          seconds: 5,
          label: "Squeeze and hold",
          cue: "Steady lift, do not bear down",
        },
        {
          kind: "relax",
          seconds: 5,
          label: "Release",
          cue: "Fully let go before the next one",
        },
      ],
      repsPerSet: 10,
      sets: 1,
      restBetweenSets: 0,
      timesPerDay: "3 sets across the day",
    },
    {
      key: "quick-and-long",
      name: "Quick and long",
      description:
        "The Sloan Kettering pattern: ten quick two second contractions, then ten long ten second holds. Quick reps train the reflex that stops leaks, long holds train endurance.",
      repPhases: [
        {
          kind: "contract",
          seconds: 2,
          label: "Quick squeeze",
          cue: "Sharp lift, then let go",
        },
        { kind: "relax", seconds: 2, label: "Release", cue: "Fully release" },
      ],
      repsPerSet: 10,
      sets: 1,
      restBetweenSets: 0,
      timesPerDay: "follow with a long set",
    },
    {
      key: "endurance",
      name: "Endurance",
      description:
        "Ten seconds on, ten seconds off. The Sloan Kettering target once you can hold five seconds cleanly. Do not rush to get here.",
      repPhases: [
        {
          kind: "contract",
          seconds: 10,
          label: "Hold",
          cue: "Keep the lift steady, keep breathing",
        },
        {
          kind: "relax",
          seconds: 10,
          label: "Release",
          cue: "Full rest, the release matters",
        },
      ],
      repsPerSet: 10,
      sets: 1,
      restBetweenSets: 0,
      timesPerDay: "3 to 5 sets across the day",
    },
  ],
};
