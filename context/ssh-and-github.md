# SSH и GitHub (PumpStatin_test)

## SSH-ключ для сервера 159.194.215.53

| | |
|---|---|
| Приватный ключ | `C:\Users\KonBas\.ssh\id_ed25519_pumpstatin` |
| Публичный ключ | `C:\Users\KonBas\.ssh\id_ed25519_pumpstatin.pub` |
| SSH config Host | `pumpstatin` или `pumpstatin-server` |
| Подключение | `ssh pumpstatin` |

Публичный ключ (добавить на сервер в `/root/.ssh/authorized_keys`):

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPT32fxFvWbi7B27zWDbtlkeb3MA7NnzlmkW1ECUprVw BaskovKonstantin-pumpstatin-159.194.215.53
```

Проверка после установки ключа на сервере:

```powershell
ssh pumpstatin "hostname"
```

## GitHub-репозиторий

| | |
|---|---|
| URL | https://github.com/BasKIcorp/PumpStatin-test |
| Организация | BasKIcorp |
| Видимость | private |
| Ветка по умолчанию | `master` |
| Remote | `origin` → `git@github.com:BasKIcorp/PumpStatin-test.git` (HTTPS push через gh) |
