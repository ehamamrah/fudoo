import threading
import uuid

from django.db import connection

RACE_ROUNDS = 10
BARRIER_TIMEOUT_SECONDS = 10


def race(*calls):
    """Starts every call at once on its own DB connection; returns each result or raised exception, in call order."""
    barrier = threading.Barrier(len(calls))
    outcomes = [None] * len(calls)
    threads = [
        threading.Thread(target=_run, args=(call, barrier, outcomes, index))
        for index, call in enumerate(calls)
    ]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    return outcomes


def new_id():
    return uuid.uuid4().hex


def outcome_kinds(outcomes):
    return sorted(type(outcome).__name__ for outcome in outcomes)


def _run(call, barrier, outcomes, index):
    try:
        barrier.wait(timeout=BARRIER_TIMEOUT_SECONDS)
        outcomes[index] = call()
    except Exception as error:
        outcomes[index] = error
    finally:
        connection.close()


def walk(api, link):
    rows = []
    while link:
        page = api.get(link).json()
        rows += page["results"]
        link = page["next"]
    return rows
