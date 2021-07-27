const got = require('@/utils/got');
const cheerio = require('cheerio');
const timezone = require('@/utils/timezone');
module.exports = async (ctx) => {
    const category = ctx.params.category ? ctx.params.category : 'all';
    const fulltext = ctx.params.fulltext ? true : false;
    // 从仓库 Sekai-World/sekai-master-db-diff 获取最新公告
    const response = await got.get(`https://sekai-world.github.io/sekai-master-db-diff/userInformations.json`);
    const posts = response.data || [];
    const list = await Promise.all(
        posts.map(async (post) => {
            let link = '';
            let description = '';
            const guid = post.displayOrder.toString() + post.id.toString(); // 双ID
            if (category !== 'all' && category !== post.informationTag) {
                return Promise.resolve(null);
            }
            if (post.path.startsWith('information/')) {
                // information 公告
                link = `https://production-web.sekai.colorfulpalette.org/${post.path}`;
                description = link;
                if (fulltext) {
                    try {
                        const shortpath = post.path.replace(/information\/index.html\?id=/, '');
                        const article = `https://production-web.sekai.colorfulpalette.org/html/${shortpath}.html`;
                        description = await ctx.cache.tryGet(article, async () => {
                            const result = await got.get(article);
                            const $ = cheerio.load(result.data);
                            return $('body').html();
                        });
                    } catch (ex) {
                        // continue regardless of error
                    }
                }
            } else {
                // 外链
                link = post.path;
                description = link;
            }

            const item = {
                title: post.title,
                link: link,
                pubDate: timezone(new Date(post.startAt), +0),
                description: description,
                category: post.informationTag, // event,gacha,music,bug,information,campaign,update
                guid: guid,
            };
            return Promise.resolve(item);
        })
    );
    ctx.state.data = {
        title: 'Project Sekai - News',
        link: 'https://pjsekai.sega.jp/',
        description: 'プロジェクトセカイ カラフルステージ！ feat.初音ミク',
        item: list.filter((item) => item !== null),
    };
};
