import * as webpack from "webpack";
import * as path from "path";
import TsconfigPathsPlugin from "tsconfig-paths-webpack-plugin";
import * as fs from "fs";
import * as webpackNodeExternals from "webpack-node-externals";
import * as WebpackChain from "webpack-chain";

//daslkjdsalkdjqlkewjqwlkejqewwqe
//webpack-chain is so fucking dumb 

var nodeCompatExternals = ["pngjs", "node-fetch"];


//no types so import like this
var UglifyJSPlugin = require("uglifyjs-webpack-plugin");

function constructApply(fn, args) {
	return new (Function.prototype.bind.apply(fn, args));
}


declare module "webpack-chain" {
	export interface Rule {
		oneOf(name: string): WebpackChain.Rule;
	}

}

export default class Alt1Chain {
	rootdir: string;
	private externalMap: webpack.ExternalsObjectElement = {};
	tsconfigfile: string = null;
	tsOptions;
	chain: WebpackChain;
	constructor(rootdir: string, opts?: Partial<Alt1WebpackOpts>) {
		this.chain = new WebpackChain();
		this.chain.context(rootdir);
		this.rootdir = rootdir;
		var dir = path.resolve(rootdir);
		while (true) {
			var file = path.resolve(dir, "tsconfig.json");
			if (fs.existsSync(file)) {
				this.tsconfigfile = file;
				var tsconfig = JSON.parse(fs.readFileSync(file, "utf8").replace(/^[^{}]+/, ""));
				tsconfig.compilerOptions.module = "esnext";//enables tree shaking
				this.tsOptions = { compilerOptions: tsconfig.compilerOptions, appendTsSuffixTo: [/\.vue$/] };
				break;
			}

			if (path.resolve(dir, "..") == dir) { break; }
			dir = path.resolve(dir, "..");
		}
		this.defaultModule();
		this.configureOpts(opts);

		this.chain.target("web");
		this.chain.node.clear().set("false", true);
	}

	entry(name: string, filename: string, append?: boolean) {
		if (!append) { this.chain.entry(name).clear(); }
		this.chain.entry(name).add(path.resolve(this.rootdir, filename));
	}

	output(dirname: string) {
		this.chain.output.path(path.resolve(this.rootdir, dirname));
	}

	makeUmd(name: string, windowExport: string) {
		this.chain.output.libraryTarget("umd");
		this.chain.output.set("library", { root: windowExport, commonjs: name, amd: name });
	}

	toConfig() {
		var conf = this.chain.toConfig();
		//webpack-chain doesn't allow turning off .node completely otherwise
		if (conf.node["false"]) { conf.node = false; }
		return conf;
	}
	addExternal(id: string, packname: string, windowExport: string) {
		this.externalMap[id] = { root: windowExport, commonjs: packname, commonjs2: packname, amd: packname } as any;
	}
	useTsconfigPaths() {
		this.chain.resolve.plugin("tsconfigpaths").use(TsconfigPathsPlugin as any).init((cl) => {
			//typings of webpack-chain are wrong (again)
			//use some hardcore casting
			var mainFields = this.chain.resolve.mainFields.values();
			if (mainFields.length == 0) { mainFields = ['module', 'main']; }
			return new (cl as any as typeof TsconfigPathsPlugin)({
				configFile: this.tsconfigfile,
				extensions: this.chain.resolve.extensions.values(),
				mainFields: mainFields
			}) as any;
		});
	}

	production(prod: boolean, hotproxy?: string) {
		this.chain.mode(prod ? "production" : "development");
		this.chain.devtool(prod ? "source-map" : 'eval-source-map');
		if (!prod && webpack.HotModuleReplacementPlugin) { this.chain.plugin("hotmodule").use(webpack.HotModuleReplacementPlugin).init(constructApply); }
		else { this.chain.plugins.delete("hotmodule"); }
		this.chain.devServer.clear();
		if (!prod) {
			this.chain.devServer
				.hot(true)
				.proxy({ "*": (hotproxy || "http://localhost/") })
				.port(8088);
		}
		this.chain.output.filename(prod ? "[name].min.js" : "[name].js");
		this.chain.output.chunkFilename(prod ? "[name]_[id].min.js" : "[name]_[id].min.js");
	}

	ugly(ugly: boolean) {
		if (!ugly) { this.chain.plugin("namedmodules").use(webpack.NamedModulesPlugin).init(constructApply); }
		else { this.chain.plugins.delete("namedmodules"); }
		this.chain.optimization.minimize(ugly);
	}

	dropconsole(drop: boolean) {
		//TODO this causes errors as webpack now uses terser plugin for minification
		/*
		this.chain.optimization.minimizer("uglifyjs-webpack-plugin")
			.clear()
			.use(UglifyJSPlugin, [{ uglifyOptions: { drop_console: drop } }])
			.init(constructApply)
			*/
	}
	nodejs(node: boolean) {
		this.chain.target(node ? "node" : "web");
		var ext = [];
		if (node) { ext.push(webpackNodeExternals({ modulesFromFile: true, modulesDir: this.rootdir }) as any); }
		ext.push(this.externalMap);
		this.chain.externals(ext);
	}

	configureOpts(override?: Partial<Alt1WebpackOpts>) {
		var opts = { ...getCmdConfig(), ...override };
		this.production(opts.production);
		this.ugly(opts.ugly);
		this.dropconsole(opts.dropConsole);
		this.nodejs(opts.nodejs);

		if (opts.esnext) { this.tsOptions.compilerOptions.target = "esnext"; }
	}

	defaultModule() {
		this.chain.resolveLoader.extensions.merge([".js", ".json", ".ts"]);
		this.chain.set("node", false);
		this.chain.resolve.extensions.clear().merge([".wasm", ".tsx", ".ts", ".mjs", ".jsx", ".js", ".json"]);

		this.chain.output.globalObject("(typeof self!='undefined'?self:this)");
		for (var ext of nodeCompatExternals) {
			this.addExternal(ext, ext, ext);
		}

		this.chain.module.rule("typescript")
			.test(/\.(ts|tsx)$/)
			.use("ts-loader").loader("ts-loader").options(this.tsOptions);
		this.chain.module.rule("css")
			.test(/\.css$/)
			.use("style").loader("style-loader").end()
			.use("css").loader("css-loader?-url").end();
		this.chain.module.rule("scss")
			.test(/\.scss$/)
			.use("style").loader("style-loader").end()
			.use("css").loader("css-loader").end()
			.use("sass").loader("sass-loader").end();
		this.chain.module.rule("imagefiles")
			.oneOf("datapng")
			.test(/\.data\.png$/i)
			.use("datapng").loader("imagedata-loader");
		this.chain.module.rule("imagefiles")
			.oneOf("image")
			.test(/\.(png|jpg|gif)$/i)
			.use("url-loader").loader("url-loader").options({ limit: 8192, name: "[path][name].[ext]" });
		this.chain.module.rule("jsonfiles")
			.test(/\.json$/)
			.type("javascript/auto")
			.use("json-loader").loader("json-loader");
		this.chain.module.rule("jsonfile")
			.test(/\.fontmeta\.json$/)
			.oneOf("fontmeta")
			.use("font-loader").loader("font-loader");
		this.chain.module.rule("html")
			.test(/\.html$/)
			.use("file").loader("file-loader").options({ name: "[path][name].[ext]" });
	}

}

export type Alt1WebpackOpts = {
	dropConsole: boolean,
	production: boolean,
	esnext: boolean,
	ugly: boolean,
	hotProxy: string,
	nodejs: boolean
};

export type NpmConfig = {
	name?: string,
	umdGlobal?: string,
	types?: string,
	runeappsLibNameRoot?: string,
	dependencies: { [name: string]: string },
	optionalDependencies: { [name: string]: string }
};

export function getCmdConfig() {
	var baseopts: Alt1WebpackOpts = {
		production: false,
		dropConsole: false,
		esnext: false,
		ugly: false,
		hotProxy: "",
		nodejs: false
	};
	for (var arg of process.argv) {
		switch (arg) {
			case "-p":
				baseopts.production = true;
				baseopts.ugly = true;
				baseopts.esnext = false;
				break;
			case "--ugly":
				baseopts.ugly = true;
				break;
			case "--nougly":
				baseopts.ugly = false;
				break;
			case "--esnext":
				baseopts.esnext = true;
				break;
			case "--noesnext":
				baseopts.esnext = false;
				break;
		}
	}
	return baseopts;
}

export function getPackageInfo(fileabs: string) {
	var cnf = JSON.parse(fs.readFileSync(fileabs, { encoding: "utf-8" })) as Partial<NpmConfig>
	if (!cnf.name) { throw "no package name on " + fileabs; }
	if (!cnf.umdGlobal && !cnf.runeappsLibNameRoot) { throw "no umdGlobal on " + fileabs; }

	return {
		dir: path.dirname(fileabs),
		name: cnf.name,
		types: cnf.types,
		umdName: cnf.umdGlobal || cnf.runeappsLibNameRoot,
		dependencies: cnf.dependencies || {},
		optionalDependencies: cnf.optionalDependencies || {}
	};
}

type TsConfigJson = {
	compilerOptions: {
		paths: { [match: string]: string },
		baseUrl: string,
		target: string,
	}
};


export type Alt1WebpackConfiguration = webpack.Configuration & {
	devServer?: {
		port: number,
		hot: boolean,
		proxy: { [match: string]: string }
	};
};

