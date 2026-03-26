def calculate_amortization_schedule(balance, annual_rate, monthly_amortization, months=12):
    """Generate an amortization schedule for a loan.

    Returns a list of monthly entries showing balance, interest, amortization.
    """
    schedule = []
    remaining = balance
    monthly_rate = annual_rate / 12

    for month in range(1, months + 1):
        interest = remaining * monthly_rate
        amortization = min(monthly_amortization, remaining)
        total_payment = interest + amortization
        remaining = remaining - amortization

        balance_start = balance if month == 1 else schedule[-1]["balance_end"]
        schedule.append({
            "month": month,
            "balance_start": round(balance_start, 2),
            "interest": round(interest, 2),
            "amortization": round(amortization, 2),
            "total_payment": round(total_payment, 2),
            "balance_end": round(remaining, 2),
        })

        if remaining <= 0:
            break

    return schedule


def calculate_monthly_interest(balance, annual_rate):
    """Calculate monthly interest cost for a given balance and annual rate."""
    return round(balance * annual_rate / 12, 2)


def calculate_total_interest_cost(balance, annual_rate, monthly_amortization, months=None):
    """Calculate total interest paid over the life of a loan or a given period."""
    if monthly_amortization <= 0:
        if months:
            return round(balance * annual_rate / 12 * months, 2)
        return None

    remaining = balance
    monthly_rate = annual_rate / 12
    total_interest = 0
    month_count = 0

    while remaining > 0:
        interest = remaining * monthly_rate
        total_interest += interest
        remaining -= min(monthly_amortization, remaining)
        month_count += 1
        if months and month_count >= months:
            break

    return round(total_interest, 2)
