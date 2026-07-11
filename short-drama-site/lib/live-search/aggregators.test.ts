import { describe, expect, it } from "vitest";
import { filterAggregatorHtml } from "@/lib/live-search/aggregators";

describe("public aggregator discovery", () => {
  it("keeps ShortDrama browse rows with episode counts", () => {
    const html = `<a href="/drama/djinn-under-contract"><img src="/cover.jpg" alt="">★ 5 67 Eps Djinn Under Contract</a>`;
    const result = filterAggregatorHtml(html, "shortdrama", "https://shortdrama.st/browse?sort=views");
    expect(result[0]).toMatchObject({ platformId: "shortdrama", title: "Djinn Under Contract", episodeCount: 67, source_type: "public_aggregator" });
  });

  it("keeps JOWO detail pages and ignores category navigation", () => {
    const html = `<a href="/category/love">情感</a><a href="/detail/XN-wxAwrCUA.html"><img src="/x.jpg" alt="如果爱情有尽头">如果爱情有尽头</a>`;
    const result = filterAggregatorHtml(html, "jowo", "https://free.jowo.tv/index.html");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ platformId: "jowo", title: "如果爱情有尽头" });
  });

  it("keeps MiniShort full movie pages but rejects article links", () => {
    const html = [
      `<a href="/fullmovies/crashing-into-my-magnate-ex-dzdrama/1"><img src="/c.jpg" alt="Crashing Into My Magnate Ex">Crashing Into My Magnate Ex</a>`,
      `<a href="/blog/top-10-romantic-short-dramas">Top 10 Romantic Short Dramas of 2025</a>`,
    ].join("");
    const result = filterAggregatorHtml(html, "minishort", "https://minishort.com/");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ platformId: "minishort", title: "Crashing Into My Magnate Ex" });
  });

  it("keeps DramaFlows episode pages and cleans labels", () => {
    const html = `<a href="/playlist/a-gods-wrath-for-his-love/episode-1">65 EP A God's Wrath for His Love</a>`;
    const result = filterAggregatorHtml(html, "dramaflows", "https://dramaflows.com/");
    expect(result[0]).toMatchObject({ platformId: "dramaflows", title: "A God's Wrath for His Love", episodeCount: 65 });
  });

  it("derives DramaFlows title from the URL when card text is only an icon", () => {
    const html = `<a href="/playlist/widows-forbidden-love/episode-1"><img alt="icon-play" src="/play.svg">Watch</a>`;
    const result = filterAggregatorHtml(html, "dramaflows", "https://dramaflows.com/");
    expect(result[0]).toMatchObject({ platformId: "dramaflows", title: "Widows Forbidden Love" });
  });

  it("cleans search result title wrappers", () => {
    const html = `<a href="/playlist/acting-on-love/episode-1">Watch Acting on Love Online Free | DramaFlows</a>`;
    const result = filterAggregatorHtml(html, "dramaflows", "https://dramaflows.com/");
    expect(result[0]).toMatchObject({ title: "Acting on Love" });
  });
});
