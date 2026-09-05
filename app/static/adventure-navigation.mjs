export const STAGES = Object.freeze([
  { id: "04", label: "Stage 1", theme: "I can take part", available: true },
  { id: "05", label: "Stage 2", theme: "I can keep it going", available: false },
  { id: "06", label: "Stage 3", theme: "I can explain and adapt", available: false },
]);

function chapterSummary(chapter) {
  const levels = Array.isArray(chapter?.levels) ? chapter.levels : [];
  return {
    name: chapter?.name,
    title: chapter?.title || chapter?.name,
    completed: levels.filter(level => level?.has_performance).length,
    total: levels.length,
    levels: levels.map(level => ({ ...level })),
  };
}

export function summarizeAdventure(library = []) {
  const chapters = Array.isArray(library) ? library.map(chapterSummary) : [];
  const completed = chapters.reduce((sum, chapter) => sum + chapter.completed, 0);
  const total = chapters.reduce((sum, chapter) => sum + chapter.total, 0);

  let current = null;
  for (const chapter of library || []) {
    if (!Array.isArray(chapter?.levels)) continue;
    const level = chapter.levels.find(item => item?.current === true && !item?.has_performance);
    if (level) {
      current = {
        ...level,
        chapter: chapter.name,
        chapterTitle: chapter.title || chapter.name,
      };
      break;
    }
  }

  return { completed, total, current, chapters };
}

export function globalLessonNumber(library = [], chapterName, levelName) {
  if (!Array.isArray(library)) return null;
  let number = 0;
  for (const chapter of library) {
    for (const level of Array.isArray(chapter?.levels) ? chapter.levels : []) {
      number += 1;
      if (chapter?.name === chapterName && level?.level === levelName) return number;
    }
  }
  return null;
}
