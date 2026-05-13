const headerPattern = /^(?:([a-zA-Z0-9-]+):\s)?(\w+)\(([^)]+)\):\s(.+)$/;

export default {
	extends: ["@commitlint/config-conventional"],
	parserPreset: {
		parserOpts: {
			headerPattern,
			headerCorrespondence: ["ticket", "type", "scope", "subject"],
		},
	},
	plugins: [
		{
			rules: {
				"type-enum-insensitive": ({ type }, when, value) => {
					if (!type) return [true];
					const isFound = value.some((val) => val.toLowerCase() === type.toLowerCase());
					return [
						when === "never" ? !isFound : isFound,
						`type must be one of [${value.join(", ")}]`,
					];
				},
			},
		},
	],
	rules: {
		"scope-empty": [2, "never"],
		"type-case": [0],
		"type-enum": [0],
		"subject-case": [0],
		"type-enum-insensitive": [
			2,
			"always",
			[
				"feat",
				"fix",
				"doc",
				"style",
				"refactor",
				"perf",
				"test",
				"build",
				"ci",
				"chore",
				"core",
				"revert",
				"merge",
				"config",
				"clean"
			],
		],
	},
};

/* 
- build — Build system or dependencies
- chore — Maintenance or tooling tasks
- ci — Continuous integration changes
- config — Configuration changes
- core — Application logic or behavior
- doc — Documentation changes
- feat — New feature
- fix — Bug fix
- merge — Merge branches
- perf — Performance improvements
- refactor — Code restructure, same behavior
- revert — Revert previous commit
- style — Formatting, no logic change
- test — Add or update tests
- clean — Code cleanup, no logic change
*/
