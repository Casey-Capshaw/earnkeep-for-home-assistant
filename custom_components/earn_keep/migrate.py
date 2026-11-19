# EarnKeep - Migration
# Migrates data from old Home Assistant entity-based Family Roles setup.

from __future__ import annotations

import logging

from homeassistant.core import HomeAssistant

from .store import EarnKeepStore

_LOGGER = logging.getLogger(__name__)


class EarnKeepMigrator:
    """Migrates data from legacy HA entities into the new store."""

    async def async_migrate(
        self, hass: HomeAssistant, store: EarnKeepStore
    ) -> dict:
        """Read old HA entities and populate the store.

        Returns a summary of what was migrated.
        """
        summary = {
            "balances_migrated": 0,
            "weekly_pay_migrated": 0,
            "interest_rate_migrated": False,
            "habits_migrated": 0,
            "accountabilities_migrated": 0,
            "transactions_migrated": 0,
            "errors": [],
        }

        # Get current family members from store
        data = store.get_data()
        family = data["family"]
        child_ids = [m["id"] for m in family]

        # Migrate bank balances from input_number.bank_balance_*
        for child_id in child_ids:
            entity_id = f"input_number.bank_balance_{child_id}"
            state = hass.states.get(entity_id)
            if state is not None:
                try:
                    balance = float(state.state)
                    await store.update_family_member(
                        child_id, {"bank_balance": balance}
                    )
                    summary["balances_migrated"] += 1
                    _LOGGER.info(
                        "Migrated balance for %s: $%.2f", child_id, balance
                    )
                except (ValueError, TypeError) as err:
                    summary["errors"].append(
                        f"Failed to migrate balance for {child_id}: {err}"
                    )

        # Migrate weekly pay from input_number.weekly_pay_*
        for child_id in child_ids:
            entity_id = f"input_number.weekly_pay_{child_id}"
            state = hass.states.get(entity_id)
            if state is not None:
                try:
                    pay = float(state.state)
                    await store.update_family_member(
                        child_id, {"compensation": pay}
                    )
                    summary["weekly_pay_migrated"] += 1
                    _LOGGER.info(
                        "Migrated compensation for %s: $%.2f", child_id, pay
                    )
                except (ValueError, TypeError) as err:
                    summary["errors"].append(
                        f"Failed to migrate compensation for {child_id}: {err}"
                    )

        # Migrate interest rate from input_number.bank_interest_rate
        interest_state = hass.states.get("input_number.bank_interest_rate")
        if interest_state is not None:
            try:
                rate = float(interest_state.state)
                await store.update_settings({"interest_rate": rate})
                summary["interest_rate_migrated"] = True
                _LOGGER.info("Migrated interest rate: %.1f%%", rate)
            except (ValueError, TypeError) as err:
                summary["errors"].append(
                    f"Failed to migrate interest rate: {err}"
                )

        # Migrate habit states from input_boolean entities
        all_states = hass.states.async_all("input_boolean")
        for state in all_states:
            entity_id = state.entity_id
            # Look for patterns like input_boolean.brush_teeth_morning_owen
            for child_id in child_ids:
                if entity_id.endswith(f"_{child_id}"):
                    # Extract the accountability slug
                    slug = entity_id.replace("input_boolean.", "").replace(
                        f"_{child_id}", ""
                    )
                    completed = state.state == "on"
                    if completed:
                        await store.toggle_habit(slug, child_id, True)
                        summary["habits_migrated"] += 1

        # Migrate accountabilities from sensor.family_roles_accountabilities
        # Old app stores as: { items: [...accountabilities] }
        acct_sensor = hass.states.get("sensor.family_roles_accountabilities")
        if acct_sensor is not None and acct_sensor.attributes:
            acct_list = acct_sensor.attributes.get("items", [])
            if acct_list:
                for acct_data in acct_list:
                    try:
                        await store.add_accountability(acct_data)
                        summary["accountabilities_migrated"] += 1
                    except Exception as err:
                        summary["errors"].append(
                            f"Failed to migrate accountability: {err}"
                        )
                _LOGGER.info(
                    "Migrated %d accountabilities",
                    summary["accountabilities_migrated"],
                )

        # Migrate transactions from sensor.family_roles_transactions
        # Old app stores as: { items: { childId: [{label, amount, date}] } }
        txn_sensor = hass.states.get("sensor.family_roles_transactions")
        if txn_sensor is not None and txn_sensor.attributes:
            txn_dict = txn_sensor.attributes.get("items", {})
            if isinstance(txn_dict, dict):
                for child_id, txn_list in txn_dict.items():
                    if not isinstance(txn_list, list):
                        continue
                    for txn_data in txn_list:
                        try:
                            await store.add_transaction(
                                child_id=child_id,
                                label=txn_data.get("label", "Migrated"),
                                amount=float(txn_data.get("amount", 0)),
                                date=txn_data.get("date"),
                                date_user_entered=False,
                                source="migration",
                            )
                            summary["transactions_migrated"] += 1
                        except Exception as err:
                            summary["errors"].append(
                                f"Failed to migrate transaction for {child_id}: {err}"
                            )
                _LOGGER.info(
                    "Migrated %d transactions",
                    summary["transactions_migrated"],
                )

        _LOGGER.info("Migration complete: %s", summary)
        return summary
