import * as  cheerio from "cheerio";
import * as  request from "request";
import * as fs from "fs-extra";
import * as argparse from "argparse";

interface Config {
    "username": string;
    "password": string;
    "node_id": string;
}

interface DataNode {
    parent: string;
    txt: string;
}

interface Storage {
    currentId: string | null;
    previousId: string | null;
    data: { [key: string]: DataNode };
    params: Params | null;
}

interface Params {
    anticsrf: string;
    get_children_offset: string;
    listing_amount: string;
    get_children_move: string;
}

const client = request.defaults({jar: true, followAllRedirects: true});

function getFields(body: string): Params {
    const c = cheerio.load(body);
    return {
        anticsrf: c("input[name='anticsrf']").val(),
        get_children_offset: c("input[name='get_children_offset']").val(),
        listing_amount: c("input[name='listing_amount']").val(),
        get_children_move: ">",
    };
}

function getData(body: string, storage: Storage) {
    const c = cheerio.load(body);
    c("small.mood").remove();
    const nodes = c("form[name='formular'] table").toArray();
    for (const node of nodes) {
        const nd = cheerio(node);
        const self: string = nd.find("tr.header div a").attr("href");
        const parent: string = nd.find("a.childVector").attr("href");
        const txt: string = nd.find("tr.header + tr td").text().trim();
        if (!storage.data[self] && parent && self) {
            storage.data[self] = {parent, txt};
            storage.currentId = self;
        }
    }
}

async function login(user: string, pass: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        client.post({
            uri: "https://kyberia.sk/id/1",
            formData: {
                login_type: "name",
                event: "login",
                login: user,
                password: pass,
            },
        }, (err, _response, body) => {
            if (err) {
                reject(err);
            } else {
                resolve(body);
            }
        });
    });
}

async function getPage(uri: string, params: Params | null = null): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const call = params ? client.post : client.get;
        call({
            uri,
            formData: params ? params : {},
        }, ((err, _response, body) => {
            if (err) {
                reject(err);
            } else {
                resolve(body);
            }
        }));
    });
}

(async () => {
    const cfg: Config = await fs.readJson("config.json");
    const s: Storage = {
        currentId: null,
        previousId: null,
        data: {},
        params: null,
    };

    const parser = new argparse.ArgumentParser({
        description: "Scrape nodes in kyberia tree",
    });
    const optionalParams = parser.addArgumentGroup({title: "Optional params"});
    optionalParams.addArgument("--username", {
        required: false,
        type: "string",
        defaultValue: cfg.username,
        help: "Your username",
    });
    optionalParams.addArgument("--password", {
        required: false,
        type: "string",
        defaultValue: cfg.password,
        help: "Your password",
    });
    optionalParams.addArgument("--node_id", {
        required: false,
        type: "string",
        defaultValue: cfg.node_id,
        help: "Node ID to scrape",
    });
    const args: Config = parser.parseArgs();
    console.info(args);
    await login(args.username, args.password);
    while (s.currentId === null || s.currentId !== s.previousId) {
        s.previousId = s.currentId;
        const d = await getPage(`https://kyberia.sk/id/${args.node_id}`, s.params);
        getData(d, s);
        s.params = getFields(d);
        await fs.writeJson(`${args.node_id}.json`, s.data, {spaces: 2});
        console.info(s.params, s.currentId, s.previousId);
    }
    process.exit(0);
})();
