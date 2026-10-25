// Ethan (#9). Ids are referenced by src/data/personas.ts: left = experiences/freedom/growth,
// right = security/family/simplicity, so Maya tallies [experiences, freedom] and Jordan [security, family].
import type { SwipeCard } from "@/types";

const PROMPT = "Which sounds more like you?";

export const SWIPE_CARDS: SwipeCard[] = [
  {
    id: "swipe-01",
    prompt: PROMPT,
    left: { label: "I'd rather spend on memories than things.", value: "experiences" },
    right: { label: "I sleep better knowing I have a cushion.", value: "security" },
  },
  {
    id: "swipe-02",
    prompt: PROMPT,
    left: { label: "I want room to say yes to spontaneous plans.", value: "freedom" },
    right: { label: "I want room to help out the people in my life.", value: "family" },
  },
  {
    id: "swipe-03",
    prompt: PROMPT,
    left: { label: "I want stories to tell, not stuff to store.", value: "experiences" },
    right: { label: "I want money to be the thing I don't think about.", value: "simplicity" },
  },
  {
    id: "swipe-04",
    prompt: PROMPT,
    left: { label: "I'm investing in who I'm becoming.", value: "growth" },
    right: { label: "I like knowing I'm covered if something goes wrong.", value: "security" },
  },
  {
    id: "swipe-05",
    prompt: PROMPT,
    left: { label: "I'd pick a concert over a new gadget.", value: "experiences" },
    right: { label: "I'd pick a gift for someone over something for me.", value: "family" },
  },
  {
    id: "swipe-06",
    prompt: PROMPT,
    left: { label: "I want options, not obligations.", value: "freedom" },
    right: { label: "A little extra saved feels better than a little extra spent.", value: "security" },
  },
  {
    id: "swipe-07",
    prompt: PROMPT,
    left: { label: "Learning something new is worth paying for.", value: "growth" },
    right: { label: "I'd rather my money run itself so I don't have to think about it.", value: "simplicity" },
  },
  {
    id: "swipe-08",
    prompt: PROMPT,
    left: { label: "My best memories cost money: trips, shows, nights out.", value: "experiences" },
    right: { label: "My money plans include other people: a partner, family, or friends.", value: "family" },
  },
];
