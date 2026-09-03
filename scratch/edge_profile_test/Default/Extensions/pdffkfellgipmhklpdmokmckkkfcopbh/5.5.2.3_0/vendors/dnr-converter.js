"use strict";
(self["webpackChunkbrowser_extension"] = self["webpackChunkbrowser_extension"] || []).push([["471"], {
28691(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  J: () => (/* binding */ rule_action_RuleActionType)
});

// UNUSED EXPORTS: RuleActionValidator

// EXTERNAL MODULE: ./node_modules/.pnpm/valibot@1.4.2_typescript@5.6.3/node_modules/valibot/dist/index.mjs
var dist = __webpack_require__(71299);
;// CONCATENATED MODULE: ./node_modules/.pnpm/@adguard+dnr-converter@1.1.2_@adguard+re2-wasm@1.2.0_typescript@5.6.3/node_modules/@adguard/dnr-converter/dist/utils/valibot.js


/**
 * Creates a strict object schema by validating the entries against the expected type.
 *
 * @template TExpected The expected type for the object schema.
 * @template TEntries The entries of the object schema.
 *
 * @see {@link strictObject}
 *
 * @param entries The entries schema.
 *
 * @returns A strict object schema.
 *
 * @example
 * ```ts
 * // Valid case
 * interface ValidExample {
 *     foo: string;
 * }
 *
 * const ValidExampleValidator = strictObjectByType<ValidExample>({
 *     foo: v.string(),
 * });
 *
 * // Invalid case
 * interface InvalidExample {
 *     foo: string;
 *     bar: number;
 * }
 *
 * const InvalidExampleValidator = strictObjectByType<InvalidExample>({
 *     foo: v.string(),
 *     baz: v.boolean(), // Error: Does not match the expected type
 *     // Error: Property 'bar' is missing
 * });
 * ```
 */ function strictObjectByType(entries) {
    return (0,dist/* .strictObject */.rej)(entries);
}
/**
 * Recursively extracts message from Valibot issue.
 *
 * @param issue Valibot's {@link BaseIssue}.
 * @param nesting Nesting level prefix (e.g. `'1'`, `'1.1'`).
 *
 * @returns Message extracted from the issue and its sub-issues.
 */ function extractMessageFromValiIssue(issue, nesting) {
    const type = `Type: "${issue.type}"`;
    const message = `Message: "${issue.message}"`;
    const path = `Path: "${getDotPath(issue)}"`;
    const messages = [
        `${nesting}. ${type} | ${message} | ${path}`
    ];
    if (issue.issues && issue.issues.length > 0) {
        const nestedMessages = issue.issues.map((subIssue, i)=>extractMessageFromValiIssue(subIssue, `${nesting}.${i + 1}`));
        messages.push(...nestedMessages);
    }
    return messages.join('\n');
}
/**
 * Extracts message from Valibot error.
 *
 * @param error Valibot's {@link ValiError}.
 *
 * @returns Message extracted from the error issues and its sub-issues.
 */ function extractMessageFromValiError(error) {
    if (error.issues.length === 0) {
        return error.message;
    }
    return error.issues.map((issue, i)=>extractMessageFromValiIssue(issue, `${i + 1}`)).join('\n');
}



;// CONCATENATED MODULE: ./node_modules/.pnpm/@adguard+dnr-converter@1.1.2_@adguard+re2-wasm@1.2.0_typescript@5.6.3/node_modules/@adguard/dnr-converter/dist/declarative-rule/modify-header-info.js



/**
 * Enum that represents the possible operations for a header modification.
 *
 * @see {@link https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/#type-HeaderOperation}
 *
 * @since Chrome 86
 */ var modify_header_info_HeaderOperation = /*#__PURE__*/ function(HeaderOperation) {
    /**
     * Adds a new entry for the specified header.
     * This operation is not supported for request headers.
     */ HeaderOperation["Append"] = "append";
    /**
     * Sets a new value for the specified header, removing any existing headers with the same name.
     */ HeaderOperation["Set"] = "set";
    /**
     * Removes all entries for the specified header.
     */ HeaderOperation["Remove"] = "remove";
    return HeaderOperation;
}({});
/**
 * Validator for {@link ModifyHeaderInfo}.
 */ const ModifyHeaderInfoValidator = strictObjectByType({
    header: dist/* .string */.YjP(),
    operation: dist/* ["enum"] */.k5n(modify_header_info_HeaderOperation),
    value: dist/* .optional */.lqM(dist/* .string */.YjP())
});



;// CONCATENATED MODULE: ./node_modules/.pnpm/@adguard+dnr-converter@1.1.2_@adguard+re2-wasm@1.2.0_typescript@5.6.3/node_modules/@adguard/dnr-converter/dist/declarative-rule/query-key-value.js



/**
 * Validator for {@link QueryKeyValue}.
 */ const QueryKeyValueValidator = strictObjectByType({
    key: dist/* .string */.YjP(),
    replaceOnly: dist/* .optional */.lqM(dist/* .boolean */.zMY()),
    value: dist/* .string */.YjP()
});



;// CONCATENATED MODULE: ./node_modules/.pnpm/@adguard+dnr-converter@1.1.2_@adguard+re2-wasm@1.2.0_typescript@5.6.3/node_modules/@adguard/dnr-converter/dist/declarative-rule/query-transform.js




/**
 * Validator for {@link QueryTransform}.
 */ const QueryTransformValidator = strictObjectByType({
    addOrReplaceParams: dist/* .optional */.lqM(dist/* .array */.YOg(QueryKeyValueValidator)),
    removeParams: dist/* .optional */.lqM(dist/* .array */.YOg(dist/* .string */.YjP()))
});



;// CONCATENATED MODULE: ./node_modules/.pnpm/@adguard+dnr-converter@1.1.2_@adguard+re2-wasm@1.2.0_typescript@5.6.3/node_modules/@adguard/dnr-converter/dist/declarative-rule/url-transform.js




/**
 * Enum that represents URL transformation schemes.
 *
 * @see {@link https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/#type-URLTransform}
 */ var url_transform_URLTransformScheme = /*#__PURE__*/ function(URLTransformScheme) {
    URLTransformScheme["Http"] = "http";
    URLTransformScheme["Https"] = "https";
    URLTransformScheme["Ftp"] = "ftp";
    URLTransformScheme["ChromeExtension"] = "chrome-extension";
    return URLTransformScheme;
}({});
/**
 * Validator for {@link URLTransform}.
 */ const URLTransformValidator = strictObjectByType({
    fragment: dist/* .optional */.lqM(dist/* .string */.YjP()),
    host: dist/* .optional */.lqM(dist/* .string */.YjP()),
    password: dist/* .optional */.lqM(dist/* .string */.YjP()),
    path: dist/* .optional */.lqM(dist/* .string */.YjP()),
    port: dist/* .optional */.lqM(dist/* .string */.YjP()),
    query: dist/* .optional */.lqM(dist/* .string */.YjP()),
    queryTransform: dist/* .optional */.lqM(QueryTransformValidator),
    scheme: dist/* .optional */.lqM(dist/* ["enum"] */.k5n(url_transform_URLTransformScheme)),
    username: dist/* .optional */.lqM(dist/* .string */.YjP())
});



;// CONCATENATED MODULE: ./node_modules/.pnpm/@adguard+dnr-converter@1.1.2_@adguard+re2-wasm@1.2.0_typescript@5.6.3/node_modules/@adguard/dnr-converter/dist/declarative-rule/redirect.js




/**
 * Validator for {@link Redirect}.
 */ const RedirectValidator = strictObjectByType({
    extensionPath: dist/* .optional */.lqM(dist/* .string */.YjP()),
    regexSubstitution: dist/* .optional */.lqM(dist/* .string */.YjP()),
    transform: dist/* .optional */.lqM(URLTransformValidator),
    url: dist/* .optional */.lqM(dist/* .string */.YjP())
});



;// CONCATENATED MODULE: ./node_modules/.pnpm/@adguard+dnr-converter@1.1.2_@adguard+re2-wasm@1.2.0_typescript@5.6.3/node_modules/@adguard/dnr-converter/dist/declarative-rule/rule-action.js





/**
 * Enum that represents the kind of action to take if a given condition matches.
 *
 * @see {@link https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/#type-RuleActionType}
 */ var rule_action_RuleActionType = /*#__PURE__*/ function(RuleActionType) {
    /**
     * Block the network request.
     */ RuleActionType["Block"] = "block";
    /**
     * Redirect the network request.
     */ RuleActionType["Redirect"] = "redirect";
    /**
     * Allow the network request.
     *
     * The request won't be intercepted if there is an allow rule which matches it.
     */ RuleActionType["Allow"] = "allow";
    /**
     * Upgrade the network request url's scheme to `https` if the request is `http` or `ftp`.
     */ RuleActionType["UpgradeScheme"] = "upgradeScheme";
    /**
     * Modify request/response headers from the network request.
     *
     * @since Chrome 86
     */ RuleActionType["ModifyHeaders"] = "modifyHeaders";
    /**
     * Allow all requests within a frame hierarchy, including the frame request itself.
     */ RuleActionType["AllowAllRequests"] = "allowAllRequests";
    return RuleActionType;
}({});
/**
 * Validator for {@link RuleAction}.
 */ const RuleActionValidator = strictObjectByType({
    redirect: dist/* .optional */.lqM(RedirectValidator),
    requestHeaders: dist/* .optional */.lqM(dist/* .array */.YOg(ModifyHeaderInfoValidator)),
    responseHeaders: dist/* .optional */.lqM(dist/* .array */.YOg(ModifyHeaderInfoValidator)),
    type: dist/* ["enum"] */.k5n(rule_action_RuleActionType)
});




},

}]);