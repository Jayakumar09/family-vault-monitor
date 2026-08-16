import { Page, expect, Locator } from '@playwright/test';

export class VaultPage {
  private readonly loginPasswordInput: Locator;
  private readonly loginButton: Locator;
  private readonly signOutButton: Locator;
  private readonly vaultHeading: Locator;
  private readonly uploadDocumentButton: Locator;
  private readonly uploadDialog: Locator;
  private readonly fileInput: Locator;
  private readonly uploadButton: Locator;
  private readonly closeButton: Locator;

  constructor(private readonly page: Page) {
    this.loginPasswordInput = page.locator('#password');

    this.loginButton = page.getByRole('button', {
      name: 'Sign In',
    });

    this.signOutButton = page.getByRole('button', {
      name: 'Sign out',
    });

    this.vaultHeading = page.getByText('Your Vault', {
      exact: true,
    });

    this.uploadDocumentButton = page.getByRole('button', {
      name: /upload document/i,
    });

    this.uploadDialog = page.getByRole('dialog');

    this.fileInput = page.locator(
      'input[type="file"]',
    );

    this.uploadButton = this.uploadDialog.getByRole('button', {
      name: 'Upload',
      exact: true,
    });

    this.closeButton = this.uploadDialog.getByRole('button', {
      name: 'Close',
      exact: true,
    });
  }

  async verifyVaultLoaded(): Promise<void> {
    await expect(this.page).not.toHaveURL(/\/login$/);

    await expect(this.loginPasswordInput).not.toBeVisible();
    await expect(this.loginButton).not.toBeVisible();

    await expect(this.signOutButton).toBeVisible();
    await expect(this.vaultHeading).toBeVisible();
  }

        async getDocumentCount(): Promise<number> {
        const documentSummary = this.page.getByText(
            /documents?\s+secured/i,
        ).first();

        await expect(documentSummary).toBeVisible({
            timeout: 15000,
        });

        // Give the Vault time to finish loading document data.
        await this.page.waitForTimeout(1000);

        const pageText = await this.page.locator('body').innerText();

        const match = pageText.match(
            /(\d+)\s+documents?\s+secured/i,
        );

        if (!match) {
            throw new Error(
            'Unable to determine the total document count from the Vault page.',
            );
        }

        return Number(match[1]);
        }

  async openUploadDialog(): Promise<void> {
    await this.uploadDocumentButton.click();

    await expect(this.uploadDialog).toBeVisible();
    await expect(this.fileInput).toBeAttached();
  }

  async uploadTestDocument(
    filePath: string,
  ): Promise<void> {
    await this.openUploadDialog();

    await this.fileInput.setInputFiles(filePath);

    await expect(this.uploadButton).toBeVisible();

    await this.uploadButton.click();

    await expect(this.uploadDialog).not.toBeVisible({
      timeout: 30000,
    });
  }

    async verifyDocumentPresent(
        fileName: string,
      ): Promise<void> {
        const documents =
          this.page.getByText(
            fileName,
            {
              exact: true,
            },
          );

        await expect
          .poll(
            async () =>
              await documents.count(),
            {
              timeout: 30000,
              message:
                `Document "${fileName}" was not found in the Vault.`,
            },
          )
          .toBeGreaterThan(0);

        await expect(
          documents.first(),
        ).toBeVisible({
          timeout: 30000,
        });
      }

    ///
       async getDocumentMatchCount(
    fileName: string,
  ): Promise<number> {
    // -----------------------------------------
    // Wait for Vault document data
    // -----------------------------------------

    await expect(
      this.page.getByText(
        /documents?\s+secured/i,
      ).first(),
    ).toBeVisible({
      timeout: 15000,
    });

    // Give the Vault time to finish rendering
    // the document cards.
    await this.page.waitForTimeout(1000);

    // -----------------------------------------
    // Find exact document names
    // -----------------------------------------

    const documents =
      this.page.getByText(
        fileName,
        {
          exact: true,
        },
      );

    return await documents.count();
  }

  // -----------------------------------------
  // Get all actual document filenames
  // -----------------------------------------

  async getDocumentFileNames(): Promise<string[]> {
            // -----------------------------------------
            // Wait for Vault document data
            // -----------------------------------------

            await expect(
              this.page.getByText(
                /documents?\s+secured/i,
              ).first(),
            ).toBeVisible({
              timeout: 15000,
            });

            // -----------------------------------------
            // Wait for document cards to render
            // -----------------------------------------

            const documentHeadings =
              this.page.locator(
                'h3.truncate.text-sm.font-semibold',
              );

            await expect
              .poll(
                async () =>
                  await documentHeadings.count(),
                {
                  timeout: 15000,
                  message:
                    'Family Vault document headings were not rendered.',
                },
              )
              .toBeGreaterThan(0);

            // -----------------------------------------
            // Read actual document filenames
            // -----------------------------------------

            const fileNames =
              await documentHeadings.allTextContents();

            // -----------------------------------------
            // Normalize filenames
            // -----------------------------------------

            return fileNames
              .map(
                (fileName) =>
                  fileName.trim(),
              )
              .filter(
                (fileName) =>
                  fileName.length > 0,
              );
          }


    ///=======
      async getDocumentActionButton(
          fileName: string,
        ): Promise<Locator> {
          // -----------------------------------------
          // Find the exact document heading
          // -----------------------------------------

          const document =
            this.page.getByRole('heading', {
              name: fileName,
              exact: true,
            });

          await expect(document).toHaveCount(1);

          await expect(document).toBeVisible({
            timeout: 15000,
          });

          await document.scrollIntoViewIfNeeded();

          // -----------------------------------------
          // Find the document card/header containing
          // the action button
          // -----------------------------------------

          const documentContainer =
            document.locator(
              'xpath=ancestor::*[.//button][1]',
            );

          await expect(
            documentContainer,
          ).toHaveCount(1);

          // -----------------------------------------
          // The action button has no accessible text,
          // aria-label, or title.
          // The inspected DOM confirms exactly one
          // button belongs to this document container.
          // -----------------------------------------

          const actionButton =
            documentContainer.getByRole('button');

          await expect(actionButton).toHaveCount(1);

          return actionButton;
        }


    ///=======

          async deleteTestDocument(
                fileName: string,
              ): Promise<void> {
                // -----------------------------------------
                // Find matching document heading
                // -----------------------------------------

                const documents =
                  this.page.getByRole(
                    'heading',
                    {
                      name: fileName,
                      exact: true,
                    },
                  );

                // -----------------------------------------
                // Wait for document to be available
                // -----------------------------------------

                await expect
                  .poll(
                    async () =>
                      await documents.count(),
                    {
                      timeout: 30000,
                      message:
                        `Document "${fileName}" was not found in the Vault.`,
                    },
                  )
                  .toBe(1);

                // -----------------------------------------
                // Select the unique document
                // -----------------------------------------

                const document =
                  documents.first();

                await expect(
                  document,
                ).toBeVisible({
                  timeout: 15000,
                });

                await document.scrollIntoViewIfNeeded();

                // -----------------------------------------
                // Find the action button belonging
                // to this specific document
                // -----------------------------------------

                const documentContainer =
                  document.locator(
                    'xpath=ancestor::*[.//button][1]',
                  );

                await expect(
                  documentContainer,
                ).toHaveCount(1);

                const actionButton =
                  documentContainer.getByRole(
                    'button',
                  );

                await expect(
                  actionButton,
                ).toHaveCount(1);

                await actionButton.click();

                // -----------------------------------------
                // Open Delete menu item
                // -----------------------------------------

                const deleteMenuItem =
                  this.page.getByRole(
                    'menuitem',
                    {
                      name: 'Delete',
                      exact: true,
                    },
                  );

                await expect(
                  deleteMenuItem,
                ).toBeVisible({
                  timeout: 10000,
                });

                // -----------------------------------------
                // Handle native confirmation
                // -----------------------------------------

                this.page.once(
                  'dialog',
                  async (dialog) => {
                    if (
                      dialog.type() !==
                      'confirm'
                    ) {
                      await dialog.dismiss();

                      throw new Error(
                        `Unexpected browser dialog type: ${dialog.type()}`,
                      );
                    }

                    const expectedMessage =
                      `Delete "${fileName}"? This cannot be undone.`;

                    if (
                      dialog.message() !==
                      expectedMessage
                    ) {
                      await dialog.dismiss();

                      throw new Error(
                        `Unexpected delete confirmation message: ${dialog.message()}`,
                      );
                    }

                    await dialog.accept();
                  },
                );

                // -----------------------------------------
                // Delete selected document
                // -----------------------------------------

                await deleteMenuItem.click();

                // -----------------------------------------
                // Wait until the document is REALLY gone
                // -----------------------------------------

                await expect
                  .poll(
                    async () =>
                      await documents.count(),
                    {
                      timeout: 30000,
                      message:
                        `Document "${fileName}" was not removed from the Vault.`,
                    },
                  )
                  .toBe(0);
              }

  ///=======


  async logout(): Promise<number> {
    const startTime = Date.now();

    await this.signOutButton.click();

    await this.page.waitForURL(
      (url) => url.pathname.endsWith('/login'),
      {
        timeout: 15000,
      },
    );

    return Date.now() - startTime;
  }

  async getPageText(): Promise<string> {
    return this.page.locator('body').innerText();
  }
}