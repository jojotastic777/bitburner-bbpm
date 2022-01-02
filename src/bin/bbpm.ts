import { NS } from "/../NetscriptDefinitions.js"

const DEFAULT_PACKAGE_LIST_URL = "https://raw.githubusercontent.com/jojotastic777/bitburner-bbpm/master/.bbpm/package-list.json"

/**
 * A reference to a particular package.
 * @example A PackageReference to the official bbpm package.
 * bbpm-official/bbpm
 */
export type PackageReference = string

/**
 * A package list.
 * These are how bbpm knows what packages are available for installation.
 */
export type PackageList = {
    /**
     * The name of the package list.
     */
    name: string

    /**
     * A list of packages, which bbpm can install.
     */
    packages: Package[]
}

/**
 * A package which bbpm can install.
 * Intended to represent a single script or library, but can include many scripts and/or libraries.
 */
export type Package = {
    /**
     * The name of the package.
     */
    name: string

    /**
     * A brief description of the package.
     */
    description: string

    /**
     * The current version of the package.
     * Not currently used for anything, but may be used to manage updates later.
     */
    version: string

    /**
     * The author of the package.
     */
    author: string

    /**
     * A list of other packages which the package depends on.
     */
    dependencies: PackageReference[]

    /**
     * A Manifest, which tells bbpm how to install the package.
     */
    manifest: Manifest
}

/**
 * A list of script files, as well as where to download them from.
 * @example The manifest for the `official-bbpm/bbpm` package.
 * {
 *     "/bin/bbpm.js": "https://github.com/jojotastic777/bitburner-bbpm/releases/download/v0.1.0/bbpm.js"
 * }
 */
export type Manifest = {
    [scriptName: string]: string
}

function normalizeFilePath(filePath: string): string {
    // If the file path starts with a slash and isn't in a subdirectory, remove the leading slash.
    filePath = "/" && !filePath.slice(1).includes("/") ? filePath.slice(1) : filePath
    // If the file path doesn't start with a slash and is in a subdirectory, add a leading slash.
    filePath = filePath[0] !== "/" && filePath.slice(1).includes("/") ? "/" + filePath : filePath

    return filePath
}

function checkFilesystem(ns: NS): boolean {
    return [
        ns.fileExists("/etc/bbpm/pkl_url_list.txt"),
        ns.fileExists("/etc/bbpm/installed_packages.txt")
    ].reduce((acc, cur) => acc && cur)
}

async function initFilesystem(ns: NS): Promise<void> {
    await ns.write("/etc/bbpm/pkl_url_list.txt", [DEFAULT_PACKAGE_LIST_URL], "w")
    await ns.write("/etc/bbpm/installed_packages.txt", [""], "w")
}

function getPackageListUrls(ns: NS): string[] {
    return ns.read("/etc/bbpm/pkl_url_list.txt").split("\n")
}

async function fetchPackageLists(ns: NS, url: string): Promise<PackageList | void> {
    let response = await fetch(url)

    if (response.status !== 200) {
        ns.tprintf(`Failed to fetch package list list from ${url}`)
        return
    }

    let responseBodyText = await response.text()

    ns.tprintf(`Successfuly fetched package list from ${url}`)

    let responseBody: PackageList | undefined
    try {
        responseBody = JSON.parse(responseBodyText)
    } catch (e) {}

    if (responseBody === undefined) {
        ns.tprintf(`Failed to parse package list from ${url}`)
        return 
    }

    ns.tprintf(`Successfully parsed package list: ${responseBody.name}`)

    return responseBody
}

async function cachePackageList(ns: NS, packageList: PackageList) {
    await ns.write(`/etc/bbpm/cache/package_lists/${packageList.name}.txt`, [JSON.stringify(packageList)], "w")
}

async function pullPackageLists(ns: NS): Promise<void> {
    ns.tprint("Updating package lists...")

    let urls = getPackageListUrls(ns)

    for (let url of urls) {
        let packageList = await fetchPackageLists(ns, url)
        
        if (packageList !== undefined) {
            await cachePackageList(ns, packageList)
        }
    }
}

function getPackageLists(ns: NS): PackageList[] {
    let cacheDirectory = ns.ls(ns.getHostname(), "/etc/bbpm/cache")

    let rawPackageLists: string[] = cacheDirectory.map(file => ns.read(file))
    
    return rawPackageLists.map(data => JSON.parse(data))
}

function resolvePackageRef(packageRef: PackageReference, packageLists: PackageList[]): Package | undefined {
    let [ listName, packageName ] = packageRef.split("/")

    return packageLists.find(pkl => pkl.name === listName)?.packages.find(pkg => pkg.name === packageName)
}

function resolvePackageDeps(packageRef: PackageReference, packageLists: PackageList[]): PackageReference[] {

    let pkg = resolvePackageRef(packageRef, packageLists)

    if (pkg === undefined) {
        return []
    }

    let depsList: string[] = [ packageRef ]
    let oldDepsListLength = 0

    while (oldDepsListLength < depsList.length) {
        oldDepsListLength = depsList.length
        depsList = [
            ...new Set([
                ...depsList,
                ...depsList
                    .filter(d => !d.startsWith("_unresolvable:"))
                    .map(d => resolvePackageRef(d, packageLists)?.dependencies ?? [ `_unresolvable:${d}` ]).reduce((acc, cur) => acc.concat(cur), [])
            ])
        ]
    }

    return depsList.filter(d => !depsList.includes(`_unresolvable:${d}`))
}

async function installPackage(ns: NS, packageRef: PackageReference, packageLists: PackageList[]) {
    let pkg: Package | undefined = resolvePackageRef(packageRef, packageLists)

    if (pkg === undefined) {
        ns.tprintf(`Package not found: ${packageRef}`)
        return
    }

    let depRefs = resolvePackageDeps(packageRef, packageLists)

    if (depRefs.filter(dep => dep.startsWith("_unresolvable:")).length > 0) {
        ns.tprintf(`Unresolvable Dependencies: ${depRefs.filter(dep => dep.startsWith("_unresolvable:")).length}`)
        return
    }

    ns.tprintf(`Installing packages: ${depRefs.join(", ")}`)

    let dependencies = depRefs.map(ref => resolvePackageRef(ref, packageLists)) as Package[]

    for (let dependency of dependencies) {
        for (let fileName of Object.keys(dependency.manifest)) {
            let fileUrl = dependency.manifest[fileName]

            let response = await fetch(fileUrl)

            if (response.status !== 200) {
                ns.tprintf(`Failed to download file ${fileName} from ${fileUrl}`)
                continue
            }

            let text = await response.text()
            await ns.write(normalizeFilePath(fileName), [text], "w")
            ns.tprintf(`Downloaded file ${fileName} from ${fileUrl}`)
        }
    }

    let installed: string[] = ns.read("/etc/bbpm/installed_packages.txt").split("\n")
    installed = [ ...new Set([ ...installed, ...depRefs ]) ].filter((line: string) => line !== "")
    await ns.write("/etc/bbpm/installed_packages.txt", [installed.join("\n")], "w")
    ns.tprintf(`Package installed: ${packageRef}`)
}

function prettyPrintPackage(pkg: Package) {
    return [
        `Name: ${pkg.name}`,
        `Description: ${pkg.description}`,
        `Version: ${pkg.version},`,
        `Author: ${pkg.author}`,
        `Dependencies:`,
        pkg.dependencies.map(dep => `    ${dep}`).join("\n"),
        `Manifest:`,
        Object.keys(pkg.manifest).map(file => `    ${file}: ${pkg.manifest[file]}`)
    ].join("\n")
}

const USAGE_STRING = [
    `Usage: bbpm <command>`,
    ``,
    `Commands:`,
    `    bbpm update                                 Update package lists from urls stored in /etc/bbpm/pkl_url_list.txt`,
    `    bbpm info <package list/<package name>      Print information on a package`,
    `    bbpm list-packages                          List all known packages`,
    `    bbpm installed                              List all installed packages`,
    `    bbpm install <package list>/<package name>  Install the specified package`,
    `    bbpm remove <package list>/<package name>   Remove all files associated with the specified package`,
    `    bbpm help                                   Display this help message`
].join("\n")

type Command = "help" | "update" | "info" | "list-packages" | "installed" | "install" | "remove"
export async function main(ns: NS) {
    if (!checkFilesystem(ns)) {
        ns.tprintf("WARNING: Filesystem not intialized.")
        await initFilesystem(ns)
        ns.tprintf("INFO: Initialized filesystem.")
    }

    const command: Command | undefined = ns.args[0] as Command | undefined

    if (command === undefined || command === "help") {
        ns.tprintf(USAGE_STRING)
        ns.exit()
        return
    }

    if (command === "update") {
        await pullPackageLists(ns)
        ns.exit()
        return
    }

    if (command === "info") {
        const packageRef = ns.args[1] as PackageReference | undefined

        if (packageRef === undefined) {
            ns.tprintf("Please specify a package.\n")
            ns.exit()
            return
        }

        let packageLists = getPackageLists(ns)
        let pkg = resolvePackageRef(packageRef, packageLists)

        if (pkg === undefined) {
            ns.tprintf(`Package not found: ${packageRef}`)
            ns.exit()
            return
        }

        ns.tprintf("Package: ")
        ns.tprintf(prettyPrintPackage(pkg).split("\n").map(line => `    ${line}`).join("\n"))

        ns.exit()
        return
    }

    if (command === "list-packages") {
        let packageLists = getPackageLists(ns)

        packageLists
            // Map each PackageList into a list of list of Packages, with a packageList added to each package.
            .map(pkl => pkl.packages.map(pkg => ({ packageList: pkl.name, ...pkg })))
            // Concatinate all the lists of Packages into a single, large list.
            .reduce((acc, cur) => acc.concat(cur))
            // Describe how to display each Package.
            .map(pkg => `${pkg.packageList}/${pkg.name}`)
            // Print each package description.
            .forEach(pkg => ns.tprintf(pkg))
        
        ns.exit()
        return
    }

    if (command === "installed") {
        let installedPackages: string = ns.read("/etc/bbpm/installed_packages.txt")

        if (installedPackages === "" || installedPackages === "\n") {
            ns.tprintf("No packages installed.")
        }

        ns.tprintf(installedPackages)
        ns.exit()
        return
    }

    if (command === "install") {
        const packageRef = ns.args[1] as PackageReference | undefined

        if (packageRef === undefined) {
            ns.tprintf("Please specify a package.\n")
            ns.exit()
            return
        }

        let packageLists = getPackageLists(ns)

        await installPackage(ns, packageRef, packageLists)

        ns.exit()
        return
    }

    if (command === "remove") {
        const packageRef = ns.args[1] as PackageReference | undefined

        if (packageRef === undefined) {
            ns.tprintf("Please specify a package.\n")
            ns.exit()
            return
        }

        let packageLists = getPackageLists(ns)
        let pkg = resolvePackageRef(packageRef, packageLists) as Package

        for (let fileName of Object.keys(pkg.manifest)) {
            ns.rm(fileName)
        }
    }
}