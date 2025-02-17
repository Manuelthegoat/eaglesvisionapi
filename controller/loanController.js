const cron = require("node-cron");
const LoanService = require("../services/loanService");
const CustomerService = require("../services/customerService");

class LoanController {
  async createLoan(req, res) {
    try {
      const {
        customerId,
        amount,
        loanTitle,
        phoneNo1,
        phoneNo2,
        houseAddress,
        officeAddress,
        maritalStatus,
        currentOccupationOfApplicant,
        spousePhoneNo,
        spouseName,
        spouseOccupation,
        spouseOfficeAddress,
        loanRequestedAmount,
        firstGuarantorsName,
        firstGuarantorsSex,
        firstGuarantorsDateOfBirth,
        firstGuarantorsPhoneNumber,
        firstGuarantorsOccupation,
        firstGuarantorsHouseAddress,
        firstGuarantorsOfficeAddress,
        secondGuarantorsName,
        secondGuarantorsSex,
        secondGuarantorsDateOfBirth,
        secondGuarantorsPhoneNumber,
        secondGuarantorsOccupation,
        secondGuarantorsHouseAddress,
        secondGuarantorsOfficeAddress,
        interestRate,
        loanDuration,
        loanStartDate,
        repaymentSchedule,
        loanEndDate,
        description,
        paymentDate,
        // ...other loan details...
      } = req.body;

      // Verify that the customer exists
      const customer = await CustomerService.fetchOne({ _id: customerId });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }

      // Parse interest rate and loan amount as numbers
      const disbursementInterestRate = parseFloat(interestRate);
      const disbursementAmount = parseFloat(amount);

      if (isNaN(disbursementInterestRate) || isNaN(disbursementAmount)) {
        return res.status(400).json({
          success: false,
          message: "Invalid interest rate or loan amount",
        });
      }

      // Calculate the interest amount based on the loan amount and interest rate
      const interestAmount = disbursementInterestRate;

      // Check if there is an existing loan for this customer
      const existingLoan = await LoanService.fetchOne({
        customer: customer._id,
      });

      if (existingLoan) {
        return res.status(400).json({
          success: false,
          message: "An existing loan already exists for this customer",
        });
      }

      // If there is no existing loan, create a new loan
      const loan = await LoanService.create({
        amount: disbursementAmount + interestAmount, // Add interest to the loan amount
        type: "disbursement",
        loanTitle,
        phoneNo1,
        phoneNo2,
        houseAddress,
        officeAddress,
        maritalStatus,
        currentOccupationOfApplicant,
        spousePhoneNo,
        spouseName,
        spouseOccupation,
        spouseOfficeAddress,
        loanRequestedAmount,
        firstGuarantorsName,
        firstGuarantorsSex,
        firstGuarantorsDateOfBirth,
        firstGuarantorsPhoneNumber,
        firstGuarantorsOccupation,
        firstGuarantorsHouseAddress,
        firstGuarantorsOfficeAddress,
        secondGuarantorsName,
        secondGuarantorsSex,
        secondGuarantorsDateOfBirth,
        secondGuarantorsPhoneNumber,
        secondGuarantorsOccupation,
        secondGuarantorsHouseAddress,
        secondGuarantorsOfficeAddress,
        status:  "active",
        interestRate,
        loanDuration,
        loanStartDate,
        loanEndDate,
        description,
        repaymentSchedule,
        paymentDate: new Date(),
        customer: customer._id,
        balance: disbursementAmount + interestAmount,
        repaymentDate: loanEndDate,
      });

      return res.status(201).json({
        success: true,
        message: "Loan created and disbursed successfully",
        data: loan,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error creating",
        error: error.message,
      });
    }
  }

  async updateLoan(req, res) {
    try {
      const { loanId } = req.params;
      const updateData = req.body;
  
      // Update the loan using the LoanService
      const updatedLoan = await LoanService.update({ _id: loanId }, updateData);
  
      return res.status(200).json({
        success: true,
        message: "Loan updated successfully",
        data: updatedLoan,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error updating loan",
        error: error.message,
      });
    }
  }

  async deleteLoan(req, res) {
    try {
      const { loanId } = req.params;
  
      // Use LoanService to delete the loan
      const result = await LoanService.delete({ _id: loanId });
  
      if (result.deletedCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Loan not found",
        });
      }
  
      return res.status(200).json({
        success: true,
        message: "Loan deleted successfully",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error deleting loan",
        error: error.message,
      });
    }
  }

  async createWithdrawal(req, res) {
    try {
      const {
        customerId, // ID of the customer making the withdrawal
        amount, // The amount being withdrawn
        loanEndDate,
        loanStartDate,
        interestRate,
        modeOfPayment,
        collectedBy,
        description,
      } = req.body;

      // Verify that the customer exists
      const customer = await CustomerService.fetchOne({ _id: customerId });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }

      // Find the existing loan for the customer
      const existingLoan = await LoanService.fetchOne({
        customer: customer._id,
      });

      if (!existingLoan) {
        return res.status(404).json({
          success: false,
          message: "Loan not found for this customer",
        });
      }

      // Calculate the remaining loan balance after deducting the withdrawal amount
      const remainingLoanBalance = existingLoan.balance - amount;

      if (remainingLoanBalance < 0) {
        return res.status(400).json({
          success: false,
          message: "Withdrawal amount exceeds the remaining loan balance",
          remainingLoanBalance: existingLoan.balance,
        });
      }

      // Create a withdrawal record
      const withdrawal = await LoanService.create({
        amount: amount,
        repaymentDate: new Date(),
        customer: customer._id,
        type: "withdrawal",
        status: "withdrawn",
        description,
        loanEndDate,
        loanStartDate,
        interestRate,
        paymentDate: new Date(),
        balance: remainingLoanBalance,
        modeOfPayment,
        collectedBy,
        // ... Other withdrawal details ...
      });

      // Update the existing loan's balance to the remaining loan balance and save it to the database
      existingLoan.balance = remainingLoanBalance;
      await existingLoan.save();

      // Include the remaining loan balance in the response data
      const responseData = {
        success: true,
        message: "Loan withdrawal created successfully",
        data: withdrawal,
        balance: remainingLoanBalance,
      };

      return res.status(201).json(responseData);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error creating loan withdrawal",
        error: error.message,
      });
    }
  }

  async createDeposit(req, res) {
    try {
      const {
        customerId, // ID of the customer making the deposit
        amount, // The amount being deposited
        loanEndDate,
        loanStartDate,
        interestRate,
        modeOfPayment,
        description,
        collectedBy,
      } = req.body;

      // Verify that the customer exists
      const customer = await CustomerService.fetchOne({ _id: customerId });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }

      // Find the existing loan for the customer
      const existingLoan = await LoanService.fetchOne({
        customer: customer._id,
      });

      if (!existingLoan) {
        return res.status(404).json({
          success: false,
          message: "Loan not found for this customer",
        });
      }
      // Parse existingLoan.balance, depositAmount, and interestAmount as numbers
      const existingBalance = parseFloat(existingLoan.balance);
      const deposit = parseFloat(amount);
      const interest = parseFloat(interestRate);

      // Check if any of the values is NaN (not a number)
      if (isNaN(existingBalance) || isNaN(deposit) || isNaN(interest)) {
        console.error("Invalid values for balance, deposit, or interest");
        return res.status(500).json({
          success: false,
          message: "Error creating loan deposit",
          error: "Invalid values for balance, deposit, or interest",
        });
      }

      // Calculate the balance after the deposit
      const balanceAfterDeposit = existingBalance + deposit + interest;
      // Create a deposit record
      const depositRecord = await LoanService.create({
        amount: amount,
        repaymentDate: new Date(),
        customer: customer._id,
        type: "deposit",
        status: "deposited",
        loanEndDate,
        loanStartDate,
        interestRate,
        description,
        modeOfPayment,
        collectedBy,
        paymentDate: new Date(),
        balance: balanceAfterDeposit,

        // ... Other deposit details ...
      });

      // Update the existing loan's balance by adding the deposit amount and save it to the database
      // Update the existing loan's balance by adding the deposit amount and save it to the database
      existingLoan.balance = balanceAfterDeposit;
      await existingLoan.save();

      // Include the remaining loan balance in the response data
      const responseData = {
        success: true,
        message: "Loan deposit created successfully",
        data: depositRecord,
        balance: balanceAfterDeposit, // Include the updated balance in the response
      };

      return res.status(201).json(responseData);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error creating loan deposit",
        error: error.message,
      });
    }
  }



  async getLoansByPaymentDate(req, res) {
    try {
      const { startDate, endDate } = req.query;
  
      // Validate and process startDate and endDate as necessary
  
      // Create a date range query for the paymentDate field
      const dateRangeQuery = {
        paymentDate: {
          $gte: startDate, // Greater than or equal to startDate
          $lte: endDate,   // Less than or equal to endDate
        },
      };
  
      // Query the database to find loans within the specified date range
      const loans = await LoanService.fetch(dateRangeQuery);
  
      return res.status(200).json({
        success: true,
        message: "Loans retrieved by payment date range successfully",
        data: loans,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error fetching loans by payment date range",
        error: error.message,
      });
    }
  }
  
  async getTotalAmountByPaymentDate(req, res) {
  try {
    const { startDate, endDate } = req.query;

    // Validate and process startDate and endDate as necessary

    // Create a date range query for the paymentDate field
    const dateRangeQuery = {
      paymentDate: {
        $gte: startDate, // Greater than or equal to startDate
        $lte: endDate,   // Less than or equal to endDate
      },
    };

    // Query the database to find loans within the specified date range
    const loans = await LoanService.fetch(dateRangeQuery);

    // Calculate the total amount for disbursements and deposits
    let totalDisbursements = 0;
    let totalDeposits = 0;

    loans.forEach((loan) => {
      if (loan.type === "disbursement") {
        totalDisbursements += loan.amount;
      } else if (loan.type === "deposit") {
        totalDeposits += loan.amount;
      }
    });

    return res.status(200).json({
      success: true,
      message: "Total amount by payment date retrieved successfully",
      totalDisbursements,
      totalDeposits,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching total amount by payment date",
      error: error.message,
    });
  }
}


  async getDefaulters(req, res) {
    try {
      // Find all loans with a status of "defaulter"
      const defaulters = await LoanService.getDefaulters();
  
      return res.status(200).json({
        success: true,
        message: "Defaulters retrieved successfully",
        data: defaulters,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error fetching defaulters",
        error: error.message,
      });
    }
  }

  async getLoans(req, res) {
    try {
      console.log("Fetching loans...");
      // Fetch all loans using the LoanService
      const loans = await LoanService.getLoans({});
      console.log("Loans fetched successfully");

      return res.status(200).json({
        success: true,
        message: "Loans retrieved successfully",
        data: loans,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error fetching loans",
        error: error.message,
      });
    }
  }

  async getLoanById(req, res) {
    try {
      const { loanId } = req.params; // Assuming the loanId is passed as a URL parameter

      // Fetch the loan by its ID from the database
      const loan = await LoanService.fetchOne({ _id: loanId });

      if (!loan) {
        return res.status(404).json({
          success: false,
          message: "Loan not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Loan retrieved successfully",
        data: loan,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error fetching loan",
        error: error.message,
      });
    }
  }
  async getCustomerLoans(req, res) {
    try {
      const { customerId } = req.params;
  
      // Verify that the customer exists
      const customer = await CustomerService.fetchOne({ _id: customerId });
  
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }
  
      // Query the database for loans associated with the customer
      const customerLoans = await LoanService.fetch({ customer: customerId });
  
      return res.status(200).json({
        success: true,
        message: "Customer loans retrieved successfully",
        data: customerLoans,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error fetching customer loans",
        error: error.message,
      });
    }
  }
  async getLoansDepositedByCashAndPaymentDate(req, res) {
    try {
      const { startDate, endDate } = req.query;
  
      // Validate and process startDate and endDate as necessary
  
      const depositLoans = await LoanService.getLoansDepositedByCashAndPaymentDate(startDate, endDate);
  
      return res.status(200).json({
        success: true,
        message: "Loans deposited by cash retrieved successfully by payment date",
        data: depositLoans,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error fetching loans deposited by cash by payment date",
        error: error.message,
      });
    }
  }

  async getTotalDepositAmountByCash(req, res) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: "Start date and end date are required",
        });
      }

      const totalDepositAmount = await LoanService.getTotalDepositAmountByCashAndDateRange(
        startDate,
        endDate
      );

      return res.status(200).json({
        success: true,
        message: "Total deposit amount via cash retrieved successfully",
        totalDepositAmount,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error fetching total deposit amount via cash",
        error: error.message,
      });
    }
  }

  async getLoansDepositedByTransfer(req, res) {
    try {
      const { startDate, endDate } = req.query;
  
      // Validate and process startDate and endDate as necessary
  
      // Create a date range query for the paymentDate field
      const dateRangeQuery = {
        paymentDate: {
          $gte: startDate, // Greater than or equal to startDate
          $lte: endDate,   // Less than or equal to endDate
        },
      };
  
      // Query the database to find loans that are "deposits" and via "transfer" within the specified date range
      const depositLoans = await LoanService.fetch({
        $and: [
          { type: "deposit" },
          { modeOfPayMent: "transfer" },
          dateRangeQuery,
        ],
      });
  
      // Calculate the total deposit amount
      let totalDeposits = 0;
      depositLoans.forEach((loan) => {
        totalDeposits += loan.amount;
      });
  
      return res.status(200).json({
        success: true,
        message: "Total loan deposits via transfer retrieved successfully",
        totalDeposits,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error fetching total loan deposits via transfer",
        error: error.message,
      });
    }
  }
  

  async getCustomerLoans(req, res, next) {
    try {
      const customerId = req.params.customerId;
      const customerLoans = await LoanService.getCustomerLoans(customerId);
      res.status(200).json(customerLoans);
    } catch (error) {
      next(error);
    }
  }
  

}
module.exports = new LoanController();
