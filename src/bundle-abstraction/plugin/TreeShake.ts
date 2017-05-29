import { OptimisedCore } from "./OptimisedCore";
import { BundleAbstraction } from "../core/BundleAbstraction";
import { each } from "realm-utils";
import { PackageAbstraction } from "../core/PackageAbstraction";
import { FileAbstraction } from "../core/FileAbstraction";

export class TreeShake {
    constructor(public core: OptimisedCore) {

    }
    public shake(): Promise<any> {
        return this.eachFile(file => this.shakeExports(file))
            .then(() => this.removeUnusedExports());
    }

    private removeUnusedExports() {
        return this.eachFile(file => {
            file.namedExports.forEach(fileExport => {
                if (!fileExport.isUsed && file.isTreeShakingAllowed()
                    && fileExport.eligibleForTreeShaking) {
                    console.log(`Remove ${fileExport.name} from ${file.fuseBoxPath}`);
                    fileExport.remove();
                }
            })
        });
    }

    private eachFile(fn: { (file: FileAbstraction) }) {
        return each(this.core.producerAbstraction.bundleAbstractions, (bundleAbstraction: BundleAbstraction​​) => {
            return each(bundleAbstraction.packageAbstractions, (packageAbstraction: PackageAbstraction) => {
                return each(packageAbstraction.fileAbstractions, (fileAbstraction: FileAbstraction) => {
                    return fn(fileAbstraction);
                });
            })
        });
    }


    private shakeExports(target: FileAbstraction) {
        return this.eachFile(file => {
            const dependencies = file.getDependencies();
            // check if our target is referenced in that file
            // e.g require('./foo') - considering that foo is resolved target
            if (dependencies.has(target)) {
                const dependency = dependencies.get(target);
                dependency.forEach(statement => {
                    if (statement.usedNames.size > 0) {
                        target.shakable = true;
                    } else {
                        target.restrictTreeShaking();
                    }
                    target.namedExports.forEach(fileExport => {

                        // now we check if file exports matches a name
                        const nameIsUsed = statement.usedNames.has(fileExport.name);
                        // if an exports is used, mark
                        // mark it
                        if (nameIsUsed) {
                            fileExport.isUsed = true;
                        }
                    });
                });
            }
        })

    }

}