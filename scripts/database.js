import { world, system, ItemStack, Player } from '@minecraft/server';

function date() {
    const date = new Date(Date.now())
    const ms = date.getMilliseconds().toString().padStart(3, "0")
    return `${date.toLocaleString().replace(' AM', `.${ms} AM`).replace(' PM', `.${ms} PM`)}`
}
export class GalactiXDB {
    logs;

    constructor(namespace = "", cacheSize = 100, saveRate = 1) {
        system.run(() => {
            const self = this
            this.#settings = {
                namespace: namespace
            };
            this.#queuedKeys = []
            this.#queuedValues = []
            this.#quickAccess = new Map()
            this.#validNamespace = /^[A-Za-z0-9_]*$/.test(this.#settings.namespace)
            this.#dimension = world.getDimension("overworld");
            this.logs = {
                startUp: true,
                save: true,
                load: true,
                set: true,
                get: true,
                has: true,
                delete: true,
                clear: true,
                values: true,
                keys: true,
            }
            function startLog() {
                console.log(
                    `§qGalactiXDB > is initialized successfully.§r namespace: ${self.#settings.namespace} §r${date()} `
                );
            }
            const VALID_NAMESPACE_ERROR = new Error(`§cGalactiXDB > ${namespace} isn't a valid namespace. accepted char: A-Z a-z 0-9 _ §r${date()}`)
            let sl = world.scoreboard.getObjective('qidb')
            this.#sL;
            const player = world.getPlayers()[0]
            if (!this.#validNamespace) throw VALID_NAMESPACE_ERROR;
            if (player)
                if (!sl || sl?.hasParticipant('x') === false) {
                    if (!sl) sl = world.scoreboard.addObjective('qidb');
                    sl.setScore('x', player.location.x)
                    sl.setScore('z', player.location.z)
                    this.#sL = { x: sl.getScore('x'), y: 318, z: sl.getScore('z') }
                    this.#dimension.runCommand(`/tickingarea add ${this.#sL.x} 319 ${this.#sL.z} ${this.#sL.x} 318 ${this.#sL.z} storagearea`);
                    startLog()
                } else {
                    this.#sL = { x: sl.getScore('x'), y: 318, z: sl.getScore('z') }
                    startLog()
                }
            world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
                if (!this.#validNamespace) throw VALID_NAMESPACE_ERROR;
                if (!initialSpawn) return;
                if (!sl || sl?.hasParticipant('x') === false) {
                    if (!sl) sl = world.scoreboard.addObjective('qidb');
                    sl.setScore('x', player.location.x)
                    sl.setScore('z', player.location.z)
                    this.#sL = { x: sl.getScore('x'), y: 318, z: sl.getScore('z') }
                    this.#dimension.runCommand(`/tickingarea add ${this.#sL.x} 319 ${this.#sL.z} ${this.#sL.x} 318 ${this.#sL.z} storagearea`);
                    startLog()
                } else {
                    this.#sL = { x: sl.getScore('x'), y: 318, z: sl.getScore('z') }
                    startLog()
                }
            })
            let show = true
            let runId
            let lastam
            system.runInterval(() => {
                const diff = self.#quickAccess.size - cacheSize;
                if (diff > 0) {
                    for (let i = 0; i < diff; i++) {
                        self.#quickAccess.delete(self.#quickAccess.keys().next()?.value);
                    }
                }
                if (self.#queuedKeys.length) {

                    if (!runId) {

                        log()
                        runId = system.runInterval(() => {
                            log()
                        }, 120)
                    }
                    show = false
                    const k = Math.min(saveRate, this.#queuedKeys.length)
                    for (let i = 0; i < k; i++) {
                        this.#romSave(this.#queuedKeys[0], this.#queuedValues[0]);
                        this.#queuedKeys.shift();
                        this.#queuedValues.shift()
                    }
                } else if (runId) {
                    system.clearRun(runId)
                    runId = undefined
                    show == false && this.logs.save == true 
                    show = true
                    return
                } else return
            }, 1)
            function log() {
                const abc = (-(self.#queuedKeys.length - lastam) / 6).toFixed(0) || '//'
                self.logs.save == true 
                lastam = self.#queuedKeys.length
            }
            world.beforeEvents.playerLeave.subscribe(() => {
                if (this.#queuedKeys.length && world.getPlayers().length < 2) {
                    console.error(
                        `\n\n\n\n§cGalactiXDB > Fatal Error > World closed too early, items not saved correctly.  \n\n` +
                        `Namespace: ${this.#settings.namespace}\n` +
                        `Lost Keys amount: ${this.#queuedKeys.length} §r${date()}\n\n\n\n`
                    )
                }
            })
        })
    }
    #validNamespace;
    #queuedKeys;
    #settings;
    #quickAccess;
    #queuedValues;
    #dimension;
    #sL;
   #load(key) {
    if (key.length > 30) {
        throw new Error(`§cGalactiXDB > Out of range: <${key}> has more than 30 characters §r${date()}`);
    }

    let canStr = false;
    try {
        world.structureManager.place(key, this.#dimension, this.#sL, { includeEntities: true });
        canStr = true;
    } catch {
    }

    let entities = this.#dimension.getEntities({
        location: this.#sL,
        type: "gxdb:storage"
    });

    if (entities.length === 0) {
        this.#dimension.spawnEntity("gxdb:storage", this.#sL);
        entities = this.#dimension.getEntities({
            location: this.#sL,
            type: "gxdb:storage"
        });
    }

    if (entities.length > 1) {
        entities.forEach((e, i) => {
            if (i > 0) e.remove();
        });
    }

    const entity = entities[0];
    if (!entity) throw new Error(`§cGalactiXDB > Failed to create or find gxdb:storage entity`);

    const invComp = entity.getComponent("inventory");
    if (!invComp) throw new Error(`§cGalactiXDB > Storage entity missing inventory component`);

    const inv = invComp.container;

    if (this.logs.load) {
        console.log(`§cGalactiXDB > Loaded inventory for key ${key}`);
    }
    return { canStr, inv };
    }
    async #save(key, canStr) {
        if (canStr) world.structureManager.delete(key);
        world.structureManager.createFromWorld(key, this.#dimension, this.#sL, this.#sL, { saveMode: "World", includeEntities: true });
        const entities = this.#dimension.getEntities({ location: this.#sL, type: "gxdb:storage" });
        entities.forEach(e => e.remove());
    }

    async #queueSaving(key, value) {
        this.#queuedKeys.push(key)
        this.#queuedValues.push(value)
    }
    async #romSave(key, value) {
        const { canStr, inv } = this.#load(key);
        if (!value) for (let i = 0; i < 256; i++) inv.setItem(i, undefined), world.setDynamicProperty(key, null);
        if (Array.isArray(value)) {
            try { for (let i = 0; i < 256; i++) inv.setItem(i, value[i] || undefined) } catch { throw new Error(`§cQIDB > Invalid value type. supported: ItemStack | ItemStack[] | undefined §r${date()}`) }
            world.setDynamicProperty(key, true)
        } else {
            try { inv.setItem(0, value), world.setDynamicProperty(key, false) } catch { throw new Error(`§cQIDB > Invalid value type. supported: ItemStack | ItemStack[] | undefined §r${date()}`) }
        }
        this.#save(key, canStr);
    }

    set(key, value) {
        if (!this.#validNamespace) throw new Error(`§cQGalactiXDB > Invalid name: <${this.#settings.namespace}>. accepted char: A-Z a-z 0-9 _ §r${date()}`);
        if (!/^[A-Za-z0-9_]*$/.test(key)) throw new Error(`§cGalactiXDB > Invalid name: <${key}>. accepted char: A-Z a-z 0-9 _ §r${date()}`);
        const time = Date.now();
        key = this.#settings.namespace + ":" + key;
        if (Array.isArray(value)) {
            if (value.length > 255) throw new Error(`§cGalactixDB > Out of range: <${key}> has more than 255 ItemStacks §r${date()}`)
            world.setDynamicProperty(key, true)
        } else {
            world.setDynamicProperty(key, false)
        }
        this.#quickAccess.set(key, value)
        if (this.#queuedKeys.includes(key)) {
            const i = this.#queuedKeys.indexOf(key)
            this.#queuedValues.splice(i, 1)
            this.#queuedKeys.splice(i, 1)
        }
        this.#queueSaving(key, value)
        this.logs.set == true 

    }

    get(key) {
        if (!this.#validNamespace) throw new Error(`§cGalactiXDB > Invalid name: <${this.#settings.namespace}>. accepted char: A-Z a-z 0-9 _ §r${date()}`);
        if (!/^[A-Za-z0-9_]*$/.test(key)) throw new Error(`§cGalactiXDB > Invalid name: <${key}>. accepted char: A-Z a-z 0-9 _ §r${date()}`);
        const time = Date.now();
        key = this.#settings.namespace + ":" + key;
        if (this.#quickAccess.has(key)) {
            this.logs.get == true && console.log(`§aGalactiXDB > Got key <${key}> succesfully. ${Date.now() - time}ms §r${date()}`)
            return this.#quickAccess.get(key);
        }
        const structure = world.structureManager.get(key)
        if (!structure) throw new Error(`§cGalactiXDB > The key < ${key} > doesn't exist.`);
        const { canStr, inv } = this.#load(key);
        const items = [];
        for (let i = 0; i < 256; i++) items.push(inv.getItem(i));
        for (let i = 255; i >= 0; i--) if (!items[i]) items.pop(); else break;
        this.#save(key, canStr);
        this.logs.get == true && console.log(`§aGalactiXDB > Got items from <${key}> succesfully. ${Date.now() - time}ms §r${date()}`)

        if (world.getDynamicProperty(key)) { this.#quickAccess.set(key, items); return items }
        else { this.#quickAccess.set(key, items[0]); return items[0]; }
    }

    has(key) {
        if (!this.#validNamespace) throw new Error(`§cGalactiXDB > Invalid name: <${this.#settings.namespace}>. accepted char: A-Z a-z 0-9 _ §r${date()}`);
        if (!/^[A-Za-z0-9_]*$/.test(key)) throw new Error(`§cGalactiXDB > Invalid name: <${key}>. accepted char: A-Z a-z 0-9 _ §r${date()}`);
        const time = Date.now();
        key = this.#settings.namespace + ":" + key;
        const exist = this.#quickAccess.has(key) || world.structureManager.get(key)
        this.logs.has == true && console.log(`§aGalactiXDB > Found key <${key}> succesfully. ${Date.now() - time}ms §r${date()}`)


        if (exist) return true; else return false
    }

    delete(key) {
        if (!this.#validNamespace) throw new Error(`§cGalactiXDB > Invalid name: <${this.#settings.namespace}>. accepted char: A-Z a-z 0-9 _ §r${date()}`);
        if (!/^[A-Za-z0-9_]*$/.test(key)) throw new Error(`§cGalactiXDB > Invalid name: <${key}>. accepted char: A-Z a-z 0-9 _ §r${date()}`);
        const time = Date.now();
        key = this.#settings.namespace + ":" + key;
        if (this.#quickAccess.has(key)) this.#quickAccess.delete(key)
        const structure = world.structureManager.get(key)
        if (structure) world.structureManager.delete(key), world.setDynamicProperty(key, null);
        else throw new Error(`§cGalactiXDB > The key <${key}> doesn't exist. §r${date()}`);
        this.logs.delete == true && console.log(`§aGalactiXDB > Deleted key <${key}> succesfully. ${Date.now() - time}ms §r${date()}`)
    }

    keys() {
        if (!this.#validNamespace) throw new Error(`§cGalactiXDB > Invalid name: <${this.#settings.namespace}>. accepted char: A-Z a-z 0-9 _ §r${date()}`);
        const allIds = world.getDynamicPropertyIds()
        const ids = []
        allIds.filter(id => id.startsWith(this.#settings.namespace + ":")).forEach(id => ids.push(id.replace(this.#settings.namespace + ":", "")))
        this.logs.keys == true && console.log(`§aGalactiXDB > Got the list of all the ${ids.length} keys. §r${date()}`)

        return ids;
    }

    values() {
        if (!this.#validNamespace) throw new Error(`§cGalactiXDB > Invalid name: <${this.#settings.namespace}>. accepted char: A-Z a-z 0-9 _ §r${date()}`);
        const time = Date.now();
        const allIds = world.getDynamicPropertyIds()
        const values = []
        const filtered = allIds.filter(id => id.startsWith(this.#settings.namespace + ":")).map(id => id.replace(this.#settings.namespace + ":", ""))
        for (const key of filtered) {
            values.push(this.get(key));
        }
        this.logs.values == true && console.log(`§aGalactiXDB > Got the list of all the ${values.length} values. ${Date.now() - time}ms §r${date()}`)

        return values;
    }
    clear() {
        if (!this.#validNamespace) throw new Error(`§cGalactiXDB > Invalid name: <${this.#settings.namespace}>. accepted char: A-Z a-z 0-9 _ §r${date()}`);
        const time = Date.now();
        const allIds = world.getDynamicPropertyIds()
        const filtered = allIds.filter(id => id.startsWith(this.#settings.namespace + ":")).map(id => id.replace(this.#settings.namespace + ":", ""))
        for (const key of filtered) {
            this.delete(key)
        }
        this.logs.clear == true && console.log(`§aGalactiXDB > Cleared, deleted ${filtered.length} values. ${Date.now() - time}ms §r${date()}`)

    }
}
