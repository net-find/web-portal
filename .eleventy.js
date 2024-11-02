import markdownIt from "markdown-it";
import markdownItAnchor from "markdown-it-anchor";
import markdownItFootnote from "markdown-it-footnote";
import markdownItAttrs from "markdown-it-attrs";
import postcss from "postcss/lib/postcss";
import htmlMin from "html-minifier-terser";
import { EleventyRenderPlugin } from "@11ty/eleventy";
import eleventyNavigationPlugin from "@11ty/eleventy-navigation";
import pluginIcons from "eleventy-plugin-icons";
import postcssConfig from "postcss-load-config";
import filters from "./config/filters.js";

export default async function (eleventyConfig) {
  eleventyConfig.addPlugin(eleventyNavigationPlugin);
  eleventyConfig.addPlugin(EleventyRenderPlugin);
  eleventyConfig.addPlugin(pluginIcons, {
    sources: [
      {
        name: "phosphor",
        path: "node_modules/@phosphor-icons/core/assets/fill",
      },
    ],
  });

  eleventyConfig.addPassthroughCopy("src/static");

  /* collections */
  eleventyConfig.addCollection("news", function (collectionApi) {
    return collectionApi.getFilteredByGlob("src/content/news/posts/*.md");
  });

  /* layout aliases */
  eleventyConfig.addLayoutAlias("base", "base.njk");
  eleventyConfig.addLayoutAlias("post", "post.njk");
  eleventyConfig.addLayoutAlias("documentation-base", "documentation/base.njk");
  eleventyConfig.addLayoutAlias("documentation-post", "documentation/post.njk");

  /* filters */
  Object.keys(filters).forEach((filterName) => {
    eleventyConfig.addFilter(filterName, filters[filterName]);
  });

  /* plugins */
  const md = markdownIt({ html: true });
  md.use(markdownItAttrs, {
    leftDelimiter: "[-",
    rightDelimiter: "-]",
  });
  md.use(markdownItAnchor, {
    permalink: markdownItAnchor.permalink.ariaHidden({
      placement: "after",
      class: "header-anchor",
      symbol: "#",
      ariaHidden: false,
    }),
    level: [1, 2, 3, 4],
    slugify: eleventyConfig.getFilter("slugify"),
  });
  md.use(markdownItFootnote);
  eleventyConfig.setLibrary("md", md);

  /* shortcodes */
  /* a way to make slots work inside content pages: https://danburzo.ro/eleventy-slotted-content/*/
  const slots = {};
  eleventyConfig.addGlobalData("eleventyComputed.slots", function () {
    return (data) => {
      const key = data.page.inputPath;
      slots[key] = slots[key] || {};
      return slots[key];
    };
  });

  eleventyConfig.addPairedShortcode("slot", function (content, name) {
    if (!name) throw new Error("Missing name for {% slot %} block!");
    slots[this.page.inputPath][name] = content;
    return "";
  });

  /* html and css optimization */
  eleventyConfig.addBundle("css", {
    transforms: [
      async function (content) {
        const { plugins } = await postcssConfig();
        let result = await postcss(plugins).process(content, {
          from: this.page.inputPath,
          to: null,
        });
        return result.css;
      },
    ],
  });
  eleventyConfig.addTransform("html-minify", (content, path) => {
    if (path && path.endsWith(".html")) {
      return htmlMin.minify(content, {
        includeAutoGeneratedTags: false,
        collapseBooleanAttributes: true,
        noNewlinesBeforeTagClose: true,
        collapseWhitespace: true,
        decodeEntities: true,
        removeComments: true,
        sortAttributes: true,
        sortClassName: true,
        minifyCSS: true,
      });
    }
    return content;
  });

  return {
    passthroughFileCopy: true,
    dir: {
      input: "src",
      includes: "_includes",
      layouts: "_layouts",
      data: "_data",
      output: "_site",
    },
  };
}
