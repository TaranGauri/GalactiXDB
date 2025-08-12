import { system, world, CustomCommandRegistry, CustomCommandParamType, CommandPermissionLevel } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { GalactiXDB } from "./database.js";

const Inventories = new GalactiXDB('inventories', 10, 270, true);

system.beforeEvents.startup.subscribe(({ customCommandRegistry }) => {
//saveinventory
customCommandRegistry.registerCommand(
    {
        name: "g:saveinventory",
        description: "Save a player's inventory to the database",
        permissionLevel: CommandPermissionLevel.Admin
    },
    (origin) => {
        const sender = origin.sourceEntity;
        if (!sender || !(sender.hasTag("perms") || sender.isOp())) return;

        const players = [...world.getPlayers()];
        if (players.length === 0) {
            sender.sendMessage("§cNo players online.");
            return;
        }

        const form = new ActionFormData()
            .title("Save Inventory")
            .body("Select a player to save their inventory.");
        players.forEach(p => form.button(p.name));

        system.run(() => {
            form.show(sender).then(res => {
                if (res.canceled) return;
                const target = players[res.selection];
                if (!target) return;

                const inv = target.getComponent("inventory").container;
                const items = [];
                for (let i = 0; i < inv.size; i++) {
                    const it = inv.getItem(i);
                    items.push(it ? it.clone() : undefined);
                }

                Inventories.set(`inv_${target.name}`, items);
                sender.sendMessage(`§aSaved inventory of §e${target.name}§a.`);
            });
        });
    }
);
//loadinventory
customCommandRegistry.registerCommand(
    {
        name: "g:loadinventory",
        description: "Load a saved inventory to a player",
        permissionLevel: CommandPermissionLevel.Admin
    },
    (origin) => {
        const sender = origin.sourceEntity;
        if (!sender || !(sender.hasTag("perms") || sender.isOp())) return;

        const keys = Inventories.keys().filter(k => k.startsWith("inv_"));
        if (!keys.length) {
            sender.sendMessage("§cNo saved inventories found.");
            return;
        }

        const form = new ModalFormData()
            .title("Load Inventory")
            .textField("Enter target player name:", "player name")
            .dropdown("Select saved inventory", keys.map(k => k.replace(/^inv_/, "")));

        system.run(() => {
            form.show(sender).then(res => {
                if (res.canceled) return;

                const targetName = (res.formValues[0] || "").trim();
                const idx = res.formValues[1];
                if (typeof idx !== "number") {
                    sender.sendMessage("§cInvalid selection.");
                    return;
                }
                const selectedKey = keys[idx];

                const target = world.getPlayers().find(p => p.name === targetName);
                if (!target) {
                    sender.sendMessage(`§cPlayer §e${targetName}§c not found.`);
                    return;
                }

                let items;
                try { items = Inventories.get(selectedKey); }
                catch { sender.sendMessage("§cFailed to read saved inventory."); return; }

                const inv = target.getComponent("inventory").container;
                inv.clearAll();
                if (Array.isArray(items)) {
                    for (let i = 0; i < items.length && i < inv.size; i++) {
                        const it = items[i];
                        if (it) inv.setItem(i, it.clone());
                    }
                } else if (items) inv.setItem(0, items.clone());

                sender.sendMessage(`§aLoaded inventory §e${selectedKey}§a to §e${target.name}§a.`);
            });
        });
    }
);
//clearinventories
customCommandRegistry.registerCommand(
    {
        name: "g:clearinventories",
        description: "Delete all saved inventories from the database",
        permissionLevel: CommandPermissionLevel.Admin
    },
    (origin) => {
        const sender = origin.sourceEntity;
        if (!sender || !(sender.hasTag("perms") || sender.isOp())) return;

        const keys = Inventories.keys();
        if (!keys.length) {
            sender.sendMessage("§cNo inventories found to delete.");
            return;
        }

        for (const key of keys) {
           system.run(() => {
               Inventories.delete(key);
           }); 
        }

        sender.sendMessage(`§aDeleted §e${keys.length}§a saved inventories from database.`);
    }
);
});
