import { getCachedMemes, renderMemeFeed } from "./feed.js";

const searchInput = document.getElementById("searchInput");
const courseFilter = document.getElementById("courseFilter");
const resultsSummary = document.getElementById("searchResultsSummary");

function normalize(value) {
    return String(value || "").trim().toLocaleLowerCase();
}

function populateCourseFilter(memes) {
    const currentValue = courseFilter.value;
    const courseTags = [...new Set(memes.map((meme) => meme.courseTag))]
        .sort((first, second) => first.localeCompare(second, undefined, { sensitivity: "base" }));

    courseFilter.replaceChildren();

    const allCourses = document.createElement("option");
    allCourses.value = "";
    allCourses.textContent = "All courses";
    courseFilter.appendChild(allCourses);

    courseTags.forEach((courseTag) => {
        const option = document.createElement("option");
        option.value = courseTag;
        option.textContent = courseTag;
        courseFilter.appendChild(option);
    });

    if (courseTags.includes(currentValue)) {
        courseFilter.value = currentValue;
    }
}

function applySearchAndFilter() {
    const startedAt = performance.now();
    const memes = getCachedMemes();
    const keyword = normalize(searchInput.value);
    const selectedCourse = normalize(courseFilter.value);

    const filteredMemes = memes.filter((meme) => {
        const matchesCourse = !selectedCourse || normalize(meme.courseTag) === selectedCourse;
        const searchableText = normalize([
            meme.title,
            meme.description,
            meme.courseTag,
            meme.authorName
        ].join(" "));
        const matchesKeyword = !keyword || searchableText.includes(keyword);

        return matchesCourse && matchesKeyword;
    });

    const isSearching = Boolean(keyword || selectedCourse);
    renderMemeFeed(filteredMemes, {
        emptyMessage: isSearching
            ? "No memes found for this subject"
            : "No memes have been posted yet."
    });

    resultsSummary.textContent = isSearching
        ? `${filteredMemes.length} meme${filteredMemes.length === 1 ? "" : "s"} found`
        : "";

    console.info(`Search completed in ${Math.round(performance.now() - startedAt)} ms.`);
}

function initializeSearch(memes) {
    populateCourseFilter(memes);
}

if (searchInput && courseFilter && resultsSummary) {
    searchInput.addEventListener("input", applySearchAndFilter);
    courseFilter.addEventListener("change", applySearchAndFilter);

    window.addEventListener("mememory:memes-loaded", (event) => {
        initializeSearch(event.detail.memes);
    });

    const existingMemes = getCachedMemes();
    if (existingMemes.length > 0) initializeSearch(existingMemes);
}
